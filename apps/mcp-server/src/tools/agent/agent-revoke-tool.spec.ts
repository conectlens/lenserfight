import { agentService } from '../../services/agent.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentRevokeTool } from './agent-revoke-tool';

jest.mock('../../services/agent.service', () => ({ agentService: { revokeTool: jest.fn() } }));

describe('revoke_agent_tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns revoked=true when service returns true', async () => {
    (agentService.revokeTool as jest.Mock).mockResolvedValue(true);
    const tool = captureTool(registerAgentRevokeTool);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a', tool_id: 't' }));
    expect(env.data).toEqual({ ai_lenser_id: 'a', tool_id: 't', revoked: true });
  });

  it('returns revoked=false when service returns false', async () => {
    (agentService.revokeTool as jest.Mock).mockResolvedValue(false);
    const tool = captureTool(registerAgentRevokeTool);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a', tool_id: 't' }));
    expect((env.data as { revoked: boolean }).revoked).toBe(false);
  });
});
