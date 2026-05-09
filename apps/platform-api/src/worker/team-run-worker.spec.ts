// Phase AL — team-run-worker unit tests.
//
// delegation_forbidden and approval_required policies are enforced inside
// fn_start_team_run (covered by pgTAP 10_delegation_policies.sql). This
// suite focuses on the worker's own four execution paths.

import { processNextTeamRun } from './team-run-worker'
import { createServiceSupabaseClient } from '../lib/supabase'

jest.mock('../lib/supabase')

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>

const CLAIMED_RUN = {
  id: 'tr-1',
  ai_lenser_id: 'agent-1',
  workflow_id: 'wf-1',
  workflow_run_id: null as null,
  metadata: {} as Record<string, unknown>,
}

function buildClient(opts: {
  claimResult?: unknown
  claimError?: { message: string }
  updateError?: { message: string } | null
  insertError?: { message: string } | null
}) {
  const eq = jest.fn().mockResolvedValue({ error: opts.updateError ?? null })
  const update = jest.fn().mockReturnValue({ eq })
  const insert = jest.fn().mockResolvedValue({ error: opts.insertError ?? null })

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'team_runs') return { update }
    if (table === 'agent_run_events') return { insert }
    return { update, insert }
  })

  const rpc = jest.fn().mockResolvedValue({
    data: opts.claimError ? null : (opts.claimResult ?? null),
    error: opts.claimError ?? null,
  })

  const schema = jest.fn().mockReturnValue({ rpc, from })

  return { client: { schema } as unknown as ReturnType<typeof createServiceSupabaseClient>, from, update, eq, insert, rpc }
}

describe('processNextTeamRun', () => {
  beforeEach(() => jest.resetAllMocks())

  it('path 3 — returns false when fn_claim_team_run returns no row (empty queue)', async () => {
    const { client } = buildClient({ claimResult: null })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(false)
  })

  it('path 1 — success: team_run updated to completed, dispatch_completed event emitted', async () => {
    const { client, update, insert } = buildClient({ claimResult: CLAIMED_RUN })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    )
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'dispatch_completed' }),
    )
  })

  it('path 2 — child run fails: team_run.update throws → status set to failed', async () => {
    const { client, eq, update } = buildClient({
      claimResult: CLAIMED_RUN,
      updateError: { message: 'DB error' },
    })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    // update called twice: first attempt (errors), then failure path
    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed' }),
    )
  })

  it('path 4 — claim RPC error: processNextTeamRun throws', async () => {
    const { client } = buildClient({ claimError: { message: 'permission denied' } })
    mockCreate.mockReturnValue(client)

    await expect(processNextTeamRun()).rejects.toThrow()
  })
})
