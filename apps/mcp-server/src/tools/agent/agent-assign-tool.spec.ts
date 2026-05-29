import { agentService } from '../../services/agent.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentAssignTool } from './agent-assign-tool';

jest.mock('../../services/agent.service', () => ({ agentService: { assignTool: jest.fn() } }));

describe('assign_agent_tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults allowed=true and profile_id=null', async () => {
    (agentService.assignTool as jest.Mock).mockResolvedValue({ id: 'x' });
    const tool = captureTool(registerAgentAssignTool);
    await tool.handler({ ai_lenser_id: 'a', tool_id: 't' });
    expect(agentService.assignTool).toHaveBeenCalledWith(expect.anything(), {
      ai_lenser_id: 'a', tool_id: 't', profile_id: null, allowed: true,
    });
  });

  it('passes through explicit allowed=false', async () => {
    (agentService.assignTool as jest.Mock).mockResolvedValue({ id: 'x' });
    const tool = captureTool(registerAgentAssignTool);
    await tool.handler({ ai_lenser_id: 'a', tool_id: 't', allowed: false });
    expect(agentService.assignTool).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ allowed: false }));
  });

  it('wraps result data', async () => {
    (agentService.assignTool as jest.Mock).mockResolvedValue({ id: 'asg1' });
    const tool = captureTool(registerAgentAssignTool);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a', tool_id: 't' }));
    expect(env.data).toEqual({ id: 'asg1' });
  });
});
