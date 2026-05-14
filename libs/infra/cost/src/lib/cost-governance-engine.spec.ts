import { describe, expect, it, vi } from 'vitest'
import { CostGovernanceEngine, CostGovernanceError, type CostRpcClient } from './cost-governance-engine'

const stubClient = (
  responses: Record<string, { data: unknown; error: { message: string } | null }>,
): CostRpcClient => ({
  rpc: vi.fn(async (fn: string) =>
    responses[fn] ?? { data: null, error: { message: `unstubbed: ${fn}` } },
  ) as unknown as CostRpcClient['rpc'],
})

describe('CostGovernanceEngine', () => {
  it('parses fn_cost_quote rows from row-shaped responses', async () => {
    const client = stubClient({
      fn_cost_quote: {
        data: [
          {
            pricing_snapshot_id: '00000000-0000-0000-0000-000000000001',
            unit_type: 'tokens',
            estimated_usd: 0.012,
            estimated_credits: 12,
            credit_rate_usd: 0.001,
            taken_at: '2026-05-15T00:00:00Z',
          },
        ],
        error: null,
      },
    })
    const engine = new CostGovernanceEngine(client)
    const q = await engine.quote({
      modelId: 'm1',
      estimatedInputTokens: 1000,
      estimatedMaxOutputTokens: 500,
    })
    expect(q.pricingSnapshotId).toBe('00000000-0000-0000-0000-000000000001')
    expect(q.estimatedCredits).toBe(12)
    expect(q.creditRateUsd).toBe(0.001)
  })

  it('translates a P0001 error into a typed CostGovernanceError', async () => {
    const client = stubClient({
      fn_cost_reserve: {
        data: null,
        error: { message: 'E_BUDGET_EXCEEDED: would breach daily limit 1000' },
      },
    })
    const engine = new CostGovernanceEngine(client)
    await expect(
      engine.reserve({
        aiLenserId: 'a1',
        pricingSnapshotId: 'p1',
        reservedCredits: 10,
        reservedUsd: 0.01,
        providerKey: 'openai',
        idempotencyKey: 'k1',
      }),
    ).rejects.toMatchObject({ code: 'E_BUDGET_EXCEEDED' })
  })

  it('refuses to reserve without an idempotency key', async () => {
    const engine = new CostGovernanceEngine(stubClient({}))
    await expect(
      engine.reserve({
        aiLenserId: 'a1',
        pricingSnapshotId: 'p1',
        reservedCredits: 10,
        reservedUsd: 0.01,
        providerKey: 'openai',
        idempotencyKey: '',
      }),
    ).rejects.toBeInstanceOf(CostGovernanceError)
  })

  it('saga: commit on success', async () => {
    const client = stubClient({
      fn_cost_reserve: {
        data: [
          {
            reservation_id: 'r1',
            status: 'held',
            held_until: '2099-01-01T00:00:00Z',
            shadow_mode: false,
          },
        ],
        error: null,
      },
      fn_cost_commit: { data: null, error: null },
      fn_cost_release: { data: null, error: null },
    })
    const engine = new CostGovernanceEngine(client)
    const out = await engine.runWithReservation(
      {
        aiLenserId: 'a1',
        pricingSnapshotId: 'p1',
        reservedCredits: 10,
        reservedUsd: 0.01,
        providerKey: 'openai',
        idempotencyKey: 'k-success',
      },
      async () => ({ actualCredits: 9, actualUsd: 0.009, result: 'ok' as const }),
    )
    expect(out).toBe('ok')
    expect(client.rpc).toHaveBeenCalledWith('fn_cost_commit', expect.any(Object))
    expect(client.rpc).not.toHaveBeenCalledWith('fn_cost_release', expect.any(Object))
  })

  it('saga: release on body failure', async () => {
    const client = stubClient({
      fn_cost_reserve: {
        data: [{ reservation_id: 'r2', status: 'held', held_until: '2099-01-01T00:00:00Z', shadow_mode: false }],
        error: null,
      },
      fn_cost_release: { data: null, error: null },
    })
    const engine = new CostGovernanceEngine(client)
    await expect(
      engine.runWithReservation(
        {
          aiLenserId: 'a1',
          pricingSnapshotId: 'p1',
          reservedCredits: 10,
          reservedUsd: 0.01,
          providerKey: 'openai',
          idempotencyKey: 'k-fail',
        },
        async () => {
          throw new Error('provider blew up')
        },
      ),
    ).rejects.toThrow(/provider blew up/)
    expect(client.rpc).toHaveBeenCalledWith('fn_cost_release', expect.any(Object))
  })
})
