import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentCancelRun } from './agent-cancel-run';

jest.mock('../../services/agent.service', () => ({ agentService: { cancelRun: jest.fn() } }));

describe('cancel_agent_run', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns cancelled:true on success', async () => {
    (agentService.cancelRun as jest.Mock).mockResolvedValue(undefined);
    const tool = captureTool(registerAgentCancelRun);
    const env = parseEnvelope(await tool.handler({ team_run_id: 'r1', ai_lenser_id: 'a1' }));
    expect(env.data).toEqual({ team_run_id: 'r1', ai_lenser_id: 'a1', cancelled: true });
  });

  it('rewrites NOT_FOUND with team_run_id', async () => {
    (agentService.cancelRun as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'generic'));
    const tool = captureTool(registerAgentCancelRun);
    const env = parseEnvelope(await tool.handler({ team_run_id: 'r1', ai_lenser_id: 'a1' }));
    expect(env.error?.message).toContain('r1');
  });
});
