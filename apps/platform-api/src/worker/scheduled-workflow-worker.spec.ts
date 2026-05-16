jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))
jest.mock('@lenserfight/infra/execution', () => ({
  WorkflowExecutionService: jest.fn(),
  getExecutionProvider: jest.fn(() => ({})),
  SupabaseDelegationHandler: jest.fn(),
}))
jest.mock('@lenserfight/utils/logger', () => ({
  nodeLogger: { info: jest.fn(), error: jest.fn() },
}))

import { createServiceSupabaseClient } from '../lib/supabase'
import { WorkflowExecutionService, getExecutionProvider } from '@lenserfight/infra/execution'
import { processNextScheduledWorkflow } from './scheduled-workflow-worker'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>
const MockWorkflowExecutionService = WorkflowExecutionService as jest.MockedClass<typeof WorkflowExecutionService>

const CLAIMED_RUN = {
  run_id: 'run-uuid',
  workflow_id: 'wf-uuid',
  schedule_id: 'sched-uuid',
  triggered_by: 'cron',
  context_inputs: {},
  global_model_id: 'claude-sonnet-4-6',
}

function buildClient(
  claimResult: unknown,
  nodes: unknown[] = [],
  edges: unknown[] = [],
  executeWorkflow?: jest.Mock,
) {
  const mockExecuteWorkflow = executeWorkflow ?? jest.fn().mockResolvedValue({ status: 'completed' })
  MockWorkflowExecutionService.mockImplementation(() => ({
    executeWorkflow: mockExecuteWorkflow,
  }) as unknown as InstanceType<typeof WorkflowExecutionService>)

  const mockUpdateStatus = jest.fn().mockResolvedValue({ data: null, error: null })
  const mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null })

  const mockRpc = jest.fn().mockImplementation(async (name: string, params?: unknown) => {
    if (name === 'fn_worker_claim_scheduled_workflow_run')
      return { data: claimResult ? [claimResult] : [], error: null }
    if (name === 'fn_worker_get_workflow_context')
      return { data: [{ workspace_id: null }], error: null }
    if (name === 'fn_worker_get_workflow_graph')
      return { data: { nodes, edges }, error: null }
    if (name === 'fn_worker_get_lens_template_body')
      return { data: 'template [[x]]', error: null }
    if (name === 'fn_get_version_contracts')
      return { data: [], error: null }
    if (name === 'fn_worker_upsert_node_result')
      return { data: null, error: null }
    return mockUpdateStatus(name, params)
  })

  const client = {
    rpc: mockRpc,
  }

  mockCreate.mockReturnValue(client as unknown as ReturnType<typeof createServiceSupabaseClient>)
  return { client, mockRpc, mockUpdateStatus, mockExecuteWorkflow, mockUpsert }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('processNextScheduledWorkflow', () => {
  it('returns false and does nothing when no run is claimed', async () => {
    buildClient(null)
    const result = await processNextScheduledWorkflow()
    expect(result).toBe(false)
    expect(MockWorkflowExecutionService).not.toHaveBeenCalled()
  })

  it('returns true and marks run completed when execution succeeds', async () => {
    const { mockUpdateStatus } = buildClient(CLAIMED_RUN)
    const result = await processNextScheduledWorkflow()
    expect(result).toBe(true)
    expect(mockUpdateStatus).toHaveBeenCalledWith('fn_update_workflow_run_status', {
      p_run_id: 'run-uuid',
      p_status: 'completed',
    })
  })

  it('returns true and marks run failed when execution throws', async () => {
    const failingExecute = jest.fn().mockRejectedValue(new Error('provider down'))
    const { mockUpdateStatus } = buildClient(CLAIMED_RUN, [], [], failingExecute)
    const result = await processNextScheduledWorkflow()
    expect(result).toBe(true)
    expect(mockUpdateStatus).toHaveBeenCalledWith('fn_update_workflow_run_status', {
      p_run_id: 'run-uuid',
      p_status: 'failed',
    })
  })

  it('deduplicates concurrent claims — second call with no pending run returns false', async () => {
    buildClient(null)
    const [a, b] = await Promise.all([
      processNextScheduledWorkflow(),
      processNextScheduledWorkflow(),
    ])
    expect(a).toBe(false)
    expect(b).toBe(false)
  })

  it('completes successfully when workflow has no nodes (zero-node workflow)', async () => {
    const emptyWorkflow = jest.fn().mockResolvedValue({ status: 'completed' })
    const { mockUpdateStatus } = buildClient(CLAIMED_RUN, [], [], emptyWorkflow)
    await processNextScheduledWorkflow()
    expect(mockUpdateStatus).toHaveBeenCalledWith('fn_update_workflow_run_status', {
      p_run_id: 'run-uuid',
      p_status: 'completed',
    })
  })

  it('passes context_inputs into the execution context rootInputs', async () => {
    const claimWithInputs = { ...CLAIMED_RUN, context_inputs: { battle_id: 'b-1' } }
    let capturedCtx: unknown
    const capturingExecute = jest.fn().mockImplementation((_nodes: unknown, _edges: unknown, ctx: unknown) => {
      capturedCtx = ctx
      return Promise.resolve({ status: 'completed' })
    })
    buildClient(claimWithInputs, [], [], capturingExecute)
    await processNextScheduledWorkflow()
    expect((capturedCtx as { rootInputs: unknown }).rootInputs).toEqual({ battle_id: 'b-1' })
  })
})
