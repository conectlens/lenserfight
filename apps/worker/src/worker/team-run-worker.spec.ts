// Phase AL — team-run-worker unit tests.
//
// The worker calls serviceClient.rpc() directly (no .schema()).
// Four paths: empty queue, success, update-throws → failed, claim error.

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))

import { processNextTeamRun } from './team-run-worker'
import { createServiceSupabaseClient } from '../lib/supabase'

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
}) {
  const rpc = jest.fn().mockImplementation(async (name: string) => {
    if (name === 'fn_worker_claim_team_run') {
      return {
        data: opts.claimError ? null : (opts.claimResult ?? null),
        error: opts.claimError ?? null,
      }
    }
    if (name === 'fn_worker_update_team_run_status') {
      return { data: null, error: opts.updateError ?? null }
    }
    return { data: null, error: null }
  })
  return { client: { rpc } as unknown as ReturnType<typeof createServiceSupabaseClient>, rpc }
}

describe('processNextTeamRun', () => {
  beforeEach(() => jest.resetAllMocks())

  it('path 3 — returns false when fn_claim_team_run returns no row (empty queue)', async () => {
    const { client } = buildClient({ claimResult: null })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(false)
  })

  it('path 1 — success: fn_worker_update_team_run_status called with completed', async () => {
    const { client, rpc } = buildClient({ claimResult: CLAIMED_RUN })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_update_team_run_status',
      expect.objectContaining({ p_team_run_id: 'tr-1', p_status: 'completed' }),
    )
  })

  it('path 2 — update throws DB error: status ultimately set to failed', async () => {
    const { client, rpc } = buildClient({
      claimResult: CLAIMED_RUN,
      updateError: { message: 'DB error' },
    })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_update_team_run_status',
      expect.objectContaining({ p_status: 'failed' }),
    )
  })

  it('path 4 — claim RPC error: processNextTeamRun rejects with the RPC error', async () => {
    const { client } = buildClient({ claimError: { message: 'permission denied' } })
    mockCreate.mockReturnValue(client)

    await expect(processNextTeamRun()).rejects.toMatchObject({ message: 'permission denied' })
  })
})
