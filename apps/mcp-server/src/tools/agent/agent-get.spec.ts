import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentGet } from './agent-get';

jest.mock('../../services/agent.service', () => ({ agentService: { get: jest.fn() } }));

describe('get_ai_lenser tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns NOT_FOUND when service returns null', async () => {
    (agentService.get as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerAgentGet);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
  });

  it('wraps data in ok envelope', async () => {
    (agentService.get as jest.Mock).mockResolvedValue({ id: 'a1', handle: 'bot' });
    const tool = captureTool(registerAgentGet);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1' }));
    expect(env.success).toBe(true);
    expect(env.data).toEqual({ id: 'a1', handle: 'bot' });
  });

  it('maps McpError(FORBIDDEN) to fail', async () => {
    (agentService.get as jest.Mock).mockRejectedValue(new McpError('FORBIDDEN', 'nope'));
    const tool = captureTool(registerAgentGet);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1' }));
    expect(env.error?.code).toBe('FORBIDDEN');
  });
});
