// team-run-worker unit tests (C3).
//
// The worker claims a team run, creates a linked workflow_run via
// fn_worker_create_team_run_workflow_run, executes it through the shared
// executor, then writes terminal status to both the workflow_run and the
// team_run. The shared executor is mocked so these tests stay isolated from
// the workflow engine.

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))
jest.mock('./run-workflow-graph', () => ({
  executeWorkflowRun: jest.fn(),
  // pass-through retry so the worker's status writes run once
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}))
jest.mock('@lenserfight/utils/logger', () => ({
  nodeLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { processNextTeamRun } from './team-run-worker'
import { createServiceSupabaseClient } from '../lib/supabase'
import { executeWorkflowRun } from './run-workflow-graph'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>
const mockExecute = executeWorkflowRun as jest.MockedFunction<typeof executeWorkflowRun>

const CLAIMED_RUN = {
  id: 'tr-1',
  ai_lenser_id: 'agent-1',
  workflow_id: 'wf-1',
  workflow_run_id: null as null,
  metadata: {} as Record<string, unknown>,
}

const DISPATCH = {
  run_id: 'run-1',
  workflow_id: 'wf-1',
  context_inputs: { foo: 'bar' },
  global_model_id: 'claude-sonnet-4-6',
  ai_lenser_id: 'agent-1',
}

function buildClient(opts: {
  claimResult?: unknown
  claimError?: { message: string }
  dispatchResult?: unknown
  dispatchError?: { message: string } | null
}) {
  const rpc = jest.fn().mockImplementation(async (name: string) => {
    if (name === 'fn_worker_claim_team_run') {
      return { data: opts.claimError ? null : (opts.claimResult ?? null), error: opts.claimError ?? null }
    }
    if (name === 'fn_worker_create_team_run_workflow_run') {
      return { data: opts.dispatchError ? null : (opts.dispatchResult ?? null), error: opts.dispatchError ?? null }
    }
    return { data: null, error: null }
  })
  return { client: { rpc } as unknown as ReturnType<typeof createServiceSupabaseClient>, rpc }
}

describe('processNextTeamRun', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns false when no team run is claimed (empty queue)', async () => {
    const { client } = buildClient({ claimResult: null })
    mockCreate.mockReturnValue(client)
    const result = await processNextTeamRun()
    expect(result).toBe(false)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('executes the workflow and marks both run and team_run completed on success', async () => {
    const { client, rpc } = buildClient({ claimResult: CLAIMED_RUN, dispatchResult: DISPATCH })
    mockCreate.mockReturnValue(client)
    mockExecute.mockResolvedValue('completed')

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ runId: 'run-1', workflowId: 'wf-1', contextInputs: { foo: 'bar' } }),
      expect.objectContaining({ workerId: expect.any(String) }),
    )
    expect(rpc).toHaveBeenCalledWith('fn_worker_set_workflow_run_status', { p_run_id: 'run-1', p_status: 'completed' })
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_finalize_team_run',
      expect.objectContaining({ p_team_run_id: 'tr-1', p_status: 'completed' }),
    )
  })

  it('marks failed when execution throws', async () => {
    const { client, rpc } = buildClient({ claimResult: CLAIMED_RUN, dispatchResult: DISPATCH })
    mockCreate.mockReturnValue(client)
    mockExecute.mockRejectedValue(new Error('provider down'))

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_finalize_team_run',
      expect.objectContaining({ p_status: 'failed', p_error_message: 'provider down' }),
    )
  })

  it('marks completed no-op when the team run has no workflow_id', async () => {
    const { client, rpc } = buildClient({ claimResult: { ...CLAIMED_RUN, workflow_id: null } })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(mockExecute).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_finalize_team_run',
      expect.objectContaining({ p_team_run_id: 'tr-1', p_status: 'completed' }),
    )
  })

  it('marks failed when dispatch creation errors', async () => {
    const { client, rpc } = buildClient({ claimResult: CLAIMED_RUN, dispatchError: { message: 'insert denied' } })
    mockCreate.mockReturnValue(client)

    const result = await processNextTeamRun()

    expect(result).toBe(true)
    expect(mockExecute).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_finalize_team_run',
      expect.objectContaining({ p_status: 'failed' }),
    )
  })

  it('rejects when the claim RPC errors', async () => {
    const { client } = buildClient({ claimError: { message: 'permission denied' } })
    mockCreate.mockReturnValue(client)
    await expect(processNextTeamRun()).rejects.toMatchObject({ message: 'permission denied' })
  })
})
