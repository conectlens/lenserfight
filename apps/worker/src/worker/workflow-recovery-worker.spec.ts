// workflow-recovery-worker unit tests (H3).

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))
jest.mock('./run-workflow-graph', () => ({
  executeWorkflowRun: jest.fn(),
  loadResumeResults: jest.fn(async () => new Map()),
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}))
jest.mock('@lenserfight/utils/logger', () => ({
  nodeLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { recoverNextStaleWorkflow } from './workflow-recovery-worker'
import { createServiceSupabaseClient } from '../lib/supabase'
import { executeWorkflowRun, loadResumeResults } from './run-workflow-graph'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>
const mockExecute = executeWorkflowRun as jest.MockedFunction<typeof executeWorkflowRun>
const mockLoadResume = loadResumeResults as jest.MockedFunction<typeof loadResumeResults>

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
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadResume.mockResolvedValue(new Map())
  })

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

  // ── Resume from checkpoint ─────────────────────────────────────────────────
  // Recovery re-enters the graph at its roots, so without a checkpoint every
  // node that already finished is re-invoked and re-billed.

  it('loads the checkpoint for the claimed run', async () => {
    const { client } = buildClient({ claim: [STALE], ctx: [EXEC_CTX] })
    mockCreate.mockReturnValue(client)
    mockExecute.mockResolvedValue('completed')

    await recoverNextStaleWorkflow()

    expect(mockLoadResume).toHaveBeenCalledWith(expect.anything(), 'run-9')
  })

  it('passes completed nodes through to the executor as resumeResults', async () => {
    const checkpoint = new Map([
      ['node-a', { nodeId: 'node-a', status: 'completed' as const, outputData: { text: 'done' } }],
    ])
    const { client } = buildClient({ claim: [STALE], ctx: [EXEC_CTX] })
    mockCreate.mockReturnValue(client)
    mockExecute.mockResolvedValue('completed')
    mockLoadResume.mockResolvedValue(checkpoint)

    await recoverNextStaleWorkflow()

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ runId: 'run-9', resumeResults: checkpoint }),
      expect.anything(),
    )
  })

  it('still executes when the checkpoint is empty', async () => {
    const { client, rpc } = buildClient({ claim: [STALE], ctx: [EXEC_CTX] })
    mockCreate.mockReturnValue(client)
    mockExecute.mockResolvedValue('completed')
    mockLoadResume.mockResolvedValue(new Map())

    expect(await recoverNextStaleWorkflow()).toBe(true)
    expect(mockExecute).toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('fn_worker_set_workflow_run_status', { p_run_id: 'run-9', p_status: 'completed' })
  })
})
