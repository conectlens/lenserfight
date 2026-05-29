import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentStartTeamRun } from './agent-start-team-run';

jest.mock('../../services/agent.service', () => ({ agentService: { startTeamRun: jest.fn() } }));

describe('start_agent_team_run', () => {
  beforeEach(() => jest.resetAllMocks());

  it('echoes ids + policy in success payload', async () => {
    (agentService.startTeamRun as jest.Mock).mockResolvedValue({ team_run_id: 'r1' });
    const tool = captureTool(registerAgentStartTeamRun);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a', workflow_id: 'w' }));
    expect(env.data).toEqual({ team_run_id: 'r1', ai_lenser_id: 'a', workflow_id: 'w', policy: 'auto' });
  });

  it('forwards inputs and policy=manual when supplied', async () => {
    (agentService.startTeamRun as jest.Mock).mockResolvedValue({ team_run_id: 'r1' });
    const tool = captureTool(registerAgentStartTeamRun);
    await tool.handler({ ai_lenser_id: 'a', workflow_id: 'w', inputs: { x: 1 }, policy: 'manual' });
    expect(agentService.startTeamRun).toHaveBeenCalledWith(expect.anything(), {
      ai_lenser_id: 'a', workflow_id: 'w', inputs: { x: 1 }, policy: 'manual',
    });
  });

  it('maps THROTTLED McpError', async () => {
    (agentService.startTeamRun as jest.Mock).mockRejectedValue(new McpError('THROTTLED', 'cap'));
    const tool = captureTool(registerAgentStartTeamRun);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a', workflow_id: 'w' }));
    expect(env.error?.code).toBe('THROTTLED');
  });
});
