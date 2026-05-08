jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))
jest.mock('@lenserfight/infra/execution', () => ({
  WorkflowExecutionService: jest.fn(),
  getExecutionProvider: jest.fn(() => ({})),
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

  const schemaClient = {
    rpc: jest.fn().mockImplementation((name: string) => {
      if (name === 'fn_claim_scheduled_workflow_run')
        return Promise.resolve({ data: claimResult ? [claimResult] : [], error: null })
      return Promise.resolve({ data: null, error: null })
    }),
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'workflow_nodes') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: nodes, error: null }),
        }
      }
      if (table === 'workflow_edges') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: edges, error: null }),
        }
      }
      if (table === 'workflow_node_results') {
        return { upsert: mockUpsert }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) }
    }),
  }

  const client = {
    schema: jest.fn().mockReturnValue(schemaClient),
    rpc: mockUpdateStatus,
  }

  mockCreate.mockReturnValue(client as unknown as ReturnType<typeof createServiceSupabaseClient>)
  return { client, schemaClient, mockUpdateStatus, mockExecuteWorkflow, mockUpsert }
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
