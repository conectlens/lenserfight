import type {
  CommitInput,
  CostQuote,
  CostReservation,
  MeterTick,
  ReleaseInput,
  ReserveInput,
} from './types'

/**
 * Minimal RPC port — workers pass in a callable bound to a service_role
 * Supabase client. Keeping the port surface narrow lets us swap clients in
 * tests without dragging the full @supabase/supabase-js type tree into this
 * lib.
 */
export interface CostRpcClient {
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<{
    data: T | null
    error: { message: string; code?: string | null } | null
  }>
}

/** Stable saga error surfaced to workers. */
export class CostGovernanceError extends Error {
  public readonly code: string
  constructor(code: string, message: string) {
    super(`${code}: ${message}`)
    this.name = 'CostGovernanceError'
    this.code = code
  }
}

const isShape = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const firstRow = <T>(rows: T | T[] | null): T | null => {
  if (rows == null) return null
  return Array.isArray(rows) ? (rows[0] ?? null) : rows
}

const parseRpcError = (msg: string, fallback: string): CostGovernanceError => {
  const m = msg.match(/^(E_[A-Z_]+)/)
  return new CostGovernanceError(m?.[1] ?? fallback, msg)
}

/**
 * GRASP Information Expert + Pure Fabrication. The engine is the only object
 * workers talk to for cost lifecycle. It does NOT decrypt BYOK keys (that is
 * libs/infra/byok's job) and it does NOT format provider requests.
 */
export class CostGovernanceEngine {
  constructor(private readonly client: CostRpcClient) {}

  async quote(input: {
    modelId: string
    estimatedInputTokens?: number
    estimatedMaxOutputTokens?: number
    estimatedUnits?: number
  }): Promise<CostQuote> {
    const { data, error } = await this.client.rpc('fn_cost_quote', {
      p_model_id: input.modelId,
      p_est_input_tokens: input.estimatedInputTokens ?? 0,
      p_est_max_output_tokens: input.estimatedMaxOutputTokens ?? 0,
      p_units: input.estimatedUnits ?? 0,
    })
    if (error) throw parseRpcError(error.message, 'E_QUOTE_FAILED')
    const row = firstRow(data) as Record<string, unknown> | null
    if (!row) throw new CostGovernanceError('E_QUOTE_EMPTY', 'fn_cost_quote returned no row')
    return {
      pricingSnapshotId: String(row.pricing_snapshot_id),
      unitType: String(row.unit_type),
      estimatedUsd: Number(row.estimated_usd),
      estimatedCredits: Number(row.estimated_credits),
      creditRateUsd: Number(row.credit_rate_usd),
      takenAt: String(row.taken_at),
    }
  }

  async reserve(input: ReserveInput): Promise<CostReservation> {
    if (!input.idempotencyKey) {
      throw new CostGovernanceError('E_IDEMPOTENCY_REQUIRED', 'idempotencyKey is required')
    }
    const ttl = input.ttlSeconds == null ? null : `${Math.max(1, Math.floor(input.ttlSeconds))} seconds`
    const { data, error } = await this.client.rpc('fn_cost_reserve', {
      p_ai_lenser_id: input.aiLenserId,
      p_pricing_snapshot_id: input.pricingSnapshotId,
      p_reserved_credits: input.reservedCredits,
      p_reserved_usd: input.reservedUsd,
      p_provider_key: input.providerKey,
      p_idempotency_key: input.idempotencyKey,
      p_context: input.context ?? {},
      p_actor_id: input.actorId ?? null,
      p_org_id: input.orgId ?? null,
      p_ttl: ttl,
    })
    if (error) throw parseRpcError(error.message, 'E_RESERVE_FAILED')
    const row = firstRow(data) as Record<string, unknown> | null
    if (!row) throw new CostGovernanceError('E_RESERVE_EMPTY', 'fn_cost_reserve returned no row')
    return {
      reservationId: String(row.reservation_id),
      status: row.status as CostReservation['status'],
      heldUntil: String(row.held_until),
      shadowMode: Boolean(row.shadow_mode),
    }
  }

  async meterTick(reservationId: string, runningCredits: number): Promise<MeterTick> {
    const { data, error } = await this.client.rpc('fn_cost_meter_tick', {
      p_reservation_id: reservationId,
      p_running_credits: runningCredits,
    })
    if (error) throw parseRpcError(error.message, 'E_METER_FAILED')
    const row = firstRow(data) as Record<string, unknown> | null
    if (!row) throw new CostGovernanceError('E_METER_EMPTY', 'fn_cost_meter_tick returned no row')
    return {
      status: row.status as MeterTick['status'],
      overLimit: Boolean(row.over_limit),
      reservedCredits: Number(row.reserved_credits),
      runningCredits: Number(row.running_credits),
    }
  }

  async commit(input: CommitInput): Promise<void> {
    const { error } = await this.client.rpc('fn_cost_commit', {
      p_reservation_id: input.reservationId,
      p_actual_credits: input.actualCredits,
      p_actual_usd: input.actualUsd,
    })
    if (error) throw parseRpcError(error.message, 'E_COMMIT_FAILED')
  }

  async release(input: ReleaseInput): Promise<void> {
    const { error } = await this.client.rpc('fn_cost_release', {
      p_reservation_id: input.reservationId,
      p_reason: input.reason,
    })
    if (error) throw parseRpcError(error.message, 'E_RELEASE_FAILED')
  }

  /**
   * Convenience saga runner used by workers: reserve -> run -> commit (or
   * release on throw). Keeps the financial state machine out of every worker.
   */
  async runWithReservation<T>(
    input: ReserveInput,
    body: (reservation: CostReservation) => Promise<{
      actualCredits: number
      actualUsd: number
      result: T
    }>,
  ): Promise<T> {
    const reservation = await this.reserve(input)
    try {
      const { actualCredits, actualUsd, result } = await body(reservation)
      await this.commit({
        reservationId: reservation.reservationId,
        actualCredits,
        actualUsd,
      })
      return result
    } catch (err) {
      const reason =
        err instanceof Error ? `${err.name}:${err.message.slice(0, 200)}` : 'unknown_error'
      try {
        await this.release({ reservationId: reservation.reservationId, reason })
      } catch {
        // Swallow release failure — the pg_cron sweeper will eventually expire
        // the row. Surfacing this would hide the original error from callers.
      }
      throw err
    }
  }
}

/** Guard so workers can recognize cost-governance failures without `instanceof`. */
export const isCostGovernanceError = (e: unknown): e is CostGovernanceError =>
  isShape(e) && typeof (e as { code?: unknown }).code === 'string' &&
  (e as { name?: unknown }).name === 'CostGovernanceError'
