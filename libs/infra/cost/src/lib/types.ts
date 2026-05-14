// libs/infra/cost — Cost Governance domain types
//
// GRASP Information Expert: these types name the shape of a financial
// transaction in LenserFight. Workers depend on them, not on raw DB rows.
//
// Security note: nothing in this module ever holds a provider key. Keys are
// resolved by libs/infra/byok behind a held reservation.

export type ReservationStatus = 'held' | 'committed' | 'released' | 'expired'

/** Per-row failure code raised by the Postgres RPCs as PostgreSQL errcode P0001. */
export type CostErrorCode =
  | 'E_BUDGET_EXCEEDED'
  | 'E_AGENT_PAUSED'
  | 'E_KILL_SWITCH'
  | 'E_PRICING_UNAVAILABLE'
  | 'E_BYOK_CONTEXT_MISSING'
  | 'E_BYOK_CONTEXT_INVALID'
  | 'E_BYOK_CONTEXT_EXPIRED'

/** Result of fn_cost_quote. */
export interface CostQuote {
  pricingSnapshotId: string
  unitType: string
  estimatedUsd: number
  estimatedCredits: number
  creditRateUsd: number
  takenAt: string
}

/** Result of fn_cost_reserve. */
export interface CostReservation {
  reservationId: string
  status: ReservationStatus
  heldUntil: string
  shadowMode: boolean
}

/** Result of fn_cost_meter_tick. */
export interface MeterTick {
  status: ReservationStatus
  overLimit: boolean
  reservedCredits: number
  runningCredits: number
}

/** Inputs to fn_cost_reserve. */
export interface ReserveInput {
  aiLenserId: string
  pricingSnapshotId: string
  reservedCredits: number
  reservedUsd: number
  providerKey: string
  idempotencyKey: string
  context?: Record<string, unknown>
  actorId?: string | null
  orgId?: string | null
  ttlSeconds?: number | null
}

/** Inputs to fn_cost_commit. */
export interface CommitInput {
  reservationId: string
  actualCredits: number
  actualUsd: number
}

/** Inputs to fn_cost_release. */
export interface ReleaseInput {
  reservationId: string
  reason: string
}
