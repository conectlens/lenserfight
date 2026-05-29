import { agentService } from '../../services/agent.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentRunAction } from './agent-run-action';

jest.mock('../../services/agent.service', () => ({ agentService: { runAction: jest.fn() } }));

describe('run_agent_action', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults context_*/metadata to null/{}', async () => {
    (agentService.runAction as jest.Mock).mockResolvedValue({ result: 'success' });
    const tool = captureTool(registerAgentRunAction);
    await tool.handler({ ai_lenser_id: 'a1', action_type: 'vote' });
    expect(agentService.runAction).toHaveBeenCalledWith(expect.anything(), {
      ai_lenser_id: 'a1', action_type: 'vote', context_type: null, context_id: null, metadata: {},
    });
  });

  it('wraps service result in ok envelope', async () => {
    (agentService.runAction as jest.Mock).mockResolvedValue({ result: 'blocked_by_policy', reason: 'r' });
    const tool = captureTool(registerAgentRunAction);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a', action_type: 'vote' }));
    expect(env.success).toBe(true);
    expect(env.data).toEqual({ result: 'blocked_by_policy', reason: 'r' });
  });
});
