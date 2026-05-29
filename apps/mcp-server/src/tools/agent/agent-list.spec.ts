import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentList } from './agent-list';

jest.mock('../../services/agent.service', () => ({
  agentService: { list: jest.fn() },
}));

describe('list_ai_lensers tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns MISSING_LENSER when neither arg nor env is set', async () => {
    delete process.env.LENSERFIGHT_LENSER_ID;
    const tool = captureTool(registerAgentList);
    const env = parseEnvelope(await tool.handler({}));
    expect(env.success).toBe(false);
    expect(env.error?.code).toBe('MISSING_LENSER');
    expect(agentService.list).not.toHaveBeenCalled();
  });

  it('delegates to agentService.list and wraps success', async () => {
    (agentService.list as jest.Mock).mockResolvedValue({ items: [{ id: 'a1' }], total: 1 });
    const tool = captureTool(registerAgentList);
    const env = parseEnvelope(await tool.handler({ owner_lenser_id: 'owner-1' }));
    expect(env.success).toBe(true);
    const data = env.data as { items: unknown[]; total: number; owner_lenser_id: string };
    expect(data).toEqual({ items: [{ id: 'a1' }], total: 1, owner_lenser_id: 'owner-1' });
    expect(env.meta.tool).toBe('list_ai_lensers');
  });

  it('falls back to LENSERFIGHT_LENSER_ID env var', async () => {
    process.env.LENSERFIGHT_LENSER_ID = 'env-owner';
    (agentService.list as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerAgentList);
    await tool.handler({});
    expect(agentService.list).toHaveBeenCalledWith(expect.anything(), { owner_lenser_id: 'env-owner' });
    delete process.env.LENSERFIGHT_LENSER_ID;
  });

  it('maps McpError to fail envelope', async () => {
    (agentService.list as jest.Mock).mockRejectedValue(new McpError('FORBIDDEN', 'nope'));
    const tool = captureTool(registerAgentList);
    const env = parseEnvelope(await tool.handler({ owner_lenser_id: 'x' }));
    expect(env.success).toBe(false);
    expect(env.error?.code).toBe('FORBIDDEN');
  });
});
