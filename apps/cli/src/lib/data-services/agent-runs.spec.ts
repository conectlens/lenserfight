jest.mock('../../utils/api', () => ({
  callRest: jest.fn(),
  callRpc: jest.fn(),
}))

import { callRest, callRpc } from '../../utils/api'
import {
  cancelAgentTeamRun,
  killAgentWorkers,
  listActiveTeamRuns,
} from './agent-runs'

const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

describe('agent-runs data service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('listActiveTeamRuns filters queued, running, and blocked', async () => {
    mockCallRest.mockResolvedValue([{ id: 'run-1', status: 'running' }])

    const rows = await listActiveTeamRuns('agent-1')

    expect(rows).toHaveLength(1)
    expect(mockCallRest).toHaveBeenCalledWith(
      'agents',
      'team_runs',
      'GET',
      undefined,
      expect.objectContaining({
        query: expect.objectContaining({
          ai_lenser_id: 'eq.agent-1',
          status: 'in.(queued,running,blocked)',
        }),
      }),
    )
  })

  it('cancelAgentTeamRun calls fn_cancel_agent_run', async () => {
    mockCallRpc.mockResolvedValue(undefined)

    await cancelAgentTeamRun('run-1', 'agent-1')

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_cancel_agent_run',
      { p_team_run_id: 'run-1', p_ai_lenser_id: 'agent-1' },
      { requireAuth: true },
    )
  })

  it('killAgentWorkers cancels active runs then enables kill switch and pause', async () => {
    mockCallRest.mockResolvedValue([
      { id: 'run-a', status: 'running' },
      { id: 'run-b', status: 'queued' },
    ])
    mockCallRpc.mockResolvedValue(undefined)

    const result = await killAgentWorkers('agent-1')

    expect(result.cancelledCount).toBe(2)
    expect(result.cancelledRunIds).toEqual(['run-a', 'run-b'])
    expect(result.killSwitchEnabled).toBe(true)
    expect(result.agentPaused).toBe(true)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_cancel_agent_run',
      { p_team_run_id: 'run-a', p_ai_lenser_id: 'agent-1' },
      { requireAuth: true },
    )
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_cancel_agent_run',
      { p_team_run_id: 'run-b', p_ai_lenser_id: 'agent-1' },
      { requireAuth: true },
    )
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_toggle_kill_switch',
      { p_ai_lenser_id: 'agent-1', p_enabled: true },
      { requireAuth: true },
    )
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_pause_agent',
      { p_ai_lenser_id: 'agent-1' },
      { requireAuth: true },
    )
  })
})
