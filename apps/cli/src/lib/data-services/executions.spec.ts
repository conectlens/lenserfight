jest.mock('../../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
}))

jest.mock('./agent-workspace', () => ({
  getHumanActivityFeed: jest.fn(),
}))

import { callRest, callRpc } from '../../utils/api'
import { getHumanActivityFeed } from './agent-workspace'
import {
  getExecutionPlatformStatus,
  getLensExecutionHistory,
  getMyExecutionActivityFeed,
  listRecentWorkflowRuns,
  listWorkflowRuns,
} from './executions'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockGetHumanActivityFeed = getHumanActivityFeed as jest.MockedFunction<
  typeof getHumanActivityFeed
>

describe('executions data-services', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('getMyExecutionActivityFeed delegates to getHumanActivityFeed', async () => {
    mockGetHumanActivityFeed.mockResolvedValue([])

    await getMyExecutionActivityFeed(10, 2)

    expect(mockGetHumanActivityFeed).toHaveBeenCalledWith(10, 2)
  })

  it('getLensExecutionHistory calls fn_get_lens_execution_history', async () => {
    mockCallRpc.mockResolvedValue([])

    await getLensExecutionHistory('lens-1', 15, 5)

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_lens_execution_history',
      { p_lens_id: 'lens-1', p_limit: 15, p_offset: 5 },
      { requireAuth: true },
    )
  })

  it('listWorkflowRuns calls fn_list_workflow_runs', async () => {
    mockCallRpc.mockResolvedValue([])

    await listWorkflowRuns('wf-1', 20, 0)

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_workflow_runs',
      { p_workflow_id: 'wf-1', p_limit: 20, p_offset: 0 },
      { requireAuth: true },
    )
  })

  it('listRecentWorkflowRuns queries workflow_runs via PostgREST', async () => {
    mockCallRest.mockResolvedValue([])

    await listRecentWorkflowRuns({ workflowId: 'wf-1', status: 'completed', limit: 10 })

    expect(mockCallRest).toHaveBeenCalledWith(
      'lenses',
      'workflow_runs',
      'GET',
      undefined,
      expect.objectContaining({
        requireAuth: true,
        query: expect.objectContaining({
          workflow_id: 'eq.wf-1',
          status: 'eq.completed',
          limit: 10,
        }),
      }),
    )
  })

  it('getExecutionPlatformStatus calls fn_get_execution_status', async () => {
    mockCallRpc.mockResolvedValue({ queue_frozen: false })

    await getExecutionPlatformStatus()

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_execution_status',
      {},
      { requireAuth: true },
    )
  })
})
