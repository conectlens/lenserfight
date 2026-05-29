import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentArchive } from './agent-archive';

jest.mock('../../services/agent.service', () => ({ agentService: { archive: jest.fn() } }));

describe('archive_ai_lenser tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('forwards ai_lenser_id and wraps result', async () => {
    (agentService.archive as jest.Mock).mockResolvedValue({ ai_lenser_id: 'a1', status: 'archived' });
    const tool = captureTool(registerAgentArchive);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1', confirm: true }));
    expect(env.success).toBe(true);
    expect(agentService.archive).toHaveBeenCalledWith(expect.anything(), { ai_lenser_id: 'a1' });
  });

  it('rewrites NOT_FOUND message with the ai_lenser_id', async () => {
    (agentService.archive as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'generic'));
    const tool = captureTool(registerAgentArchive);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1', confirm: true }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(env.error?.message).toContain('a1');
  });
});
