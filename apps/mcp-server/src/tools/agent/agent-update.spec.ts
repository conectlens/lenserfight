import { agentService } from '../../services/agent.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentUpdate } from './agent-update';

jest.mock('../../services/agent.service', () => ({ agentService: { update: jest.fn() } }));

describe('update_ai_lenser tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns ok with patched_keys', async () => {
    (agentService.update as jest.Mock).mockResolvedValue({ patched_keys: ['bio'] });
    const tool = captureTool(registerAgentUpdate);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1', patch: { bio: 'new' } }));
    expect(env.success).toBe(true);
    expect(env.data).toEqual({ ai_lenser_id: 'a1', patched_keys: ['bio'] });
  });

  it('forwards patch object to service unchanged', async () => {
    (agentService.update as jest.Mock).mockResolvedValue({ patched_keys: ['bio', 'display_name'] });
    const tool = captureTool(registerAgentUpdate);
    const patch = { bio: 'b', display_name: 'd' };
    await tool.handler({ ai_lenser_id: 'a1', patch });
    expect(agentService.update).toHaveBeenCalledWith(expect.anything(), { ai_lenser_id: 'a1', patch });
  });
});
