// workflow-recovery-worker unit tests (H3).

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))
jest.mock('./run-workflow-graph', () => ({
  executeWorkflowRun: jest.fn(),
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}))
jest.mock('@lenserfight/utils/logger', () => ({
  nodeLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { recoverNextStaleWorkflow } from './workflow-recovery-worker'
import { createServiceSupabaseClient } from '../lib/supabase'
import { executeWorkflowRun } from './run-workflow-graph'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>
const mockExecute = executeWorkflowRun as jest.MockedFunction<typeof executeWorkflowRun>

const STALE = { run_id: 'run-9', workflow_id: 'wf-9', parent_run_id: null, recursion_depth: 0, previous_status: 'running' }
const EXEC_CTX = { workflow_id: 'wf-9', context_inputs: { a: 1 }, global_model_id: null, ai_lenser_id: null }

function buildClient(opts: {
  claim?: unknown
  claimError?: { message: string }
  ctx?: unknown
  ctxError?: { message: string } | null
}) {
  const rpc = jest.fn().mockImplementation(async (name: string) => {
    if (name === 'fn_claim_stale_workflow_run') {
      return { data: opts.claimError ? null : (opts.claim ?? null), error: opts.claimError ?? null }
    }
    if (name === 'fn_worker_get_run_exec_context') {
      return { data: opts.ctxError ? null : (opts.ctx ?? null), error: opts.ctxError ?? null }
    }
    return { data: null, error: null }
  })
  return { client: { rpc } as unknown as ReturnType<typeof createServiceSupabaseClient>, rpc }
}

describe('recoverNextStaleWorkflow', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns false when no stale run is claimable', async () => {
    const { client } = buildClient({ claim: null })
    mockCreate.mockReturnValue(client)
    expect(await recoverNextStaleWorkflow()).toBe(false)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('re-executes a claimed stale run and writes completed', async () => {
    const { client, rpc } = buildClient({ claim: [STALE], ctx: [EXEC_CTX] })
    mockCreate.mockReturnValue(client)
    mockExecute.mockResolvedValue('completed')

    expect(await recoverNextStaleWorkflow()).toBe(true)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ runId: 'run-9', workflowId: 'wf-9', contextInputs: { a: 1 } }),
      expect.objectContaining({ workerId: expect.any(String) }),
    )
    expect(rpc).toHaveBeenCalledWith('fn_worker_set_workflow_run_status', { p_run_id: 'run-9', p_status: 'completed' })
  })

  it('marks failed when the exec context cannot be loaded', async () => {
    const { client, rpc } = buildClient({ claim: [STALE], ctxError: { message: 'gone' } })
    mockCreate.mockReturnValue(client)

    expect(await recoverNextStaleWorkflow()).toBe(true)
    expect(mockExecute).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('fn_worker_set_workflow_run_status', { p_run_id: 'run-9', p_status: 'failed' })
  })

  it('marks failed when re-execution throws', async () => {
    const { client, rpc } = buildClient({ claim: [STALE], ctx: [EXEC_CTX] })
    mockCreate.mockReturnValue(client)
    mockExecute.mockRejectedValue(new Error('still broken'))

    expect(await recoverNextStaleWorkflow()).toBe(true)
    expect(rpc).toHaveBeenCalledWith('fn_worker_set_workflow_run_status', { p_run_id: 'run-9', p_status: 'failed' })
  })
})
