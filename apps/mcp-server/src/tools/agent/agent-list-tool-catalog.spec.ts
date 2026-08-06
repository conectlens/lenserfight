import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentListToolCatalog } from './agent-list-tool-catalog';

jest.mock('../../services/agent.service', () => ({
  agentService: { listToolCatalog: jest.fn() },
}));

describe('list_agent_tool_catalog tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns MISSING_LENSER when neither arg nor env is set', async () => {
    delete process.env.LENSERFIGHT_LENSER_ID;
    const tool = captureTool(registerAgentListToolCatalog);
    const env = parseEnvelope(await tool.handler({}));
    expect(env.success).toBe(false);
    expect(env.error?.code).toBe('MISSING_LENSER');
    expect(agentService.listToolCatalog).not.toHaveBeenCalled();
  });

  it('delegates to agentService.listToolCatalog and wraps success', async () => {
    (agentService.listToolCatalog as jest.Mock).mockResolvedValue({
      items: [{ id: 't1', key: 'web_search' }],
      total: 1,
    });
    const tool = captureTool(registerAgentListToolCatalog);
    const env = parseEnvelope(await tool.handler({ owner_lenser_id: 'owner-1' }));
    expect(env.success).toBe(true);
    const data = env.data as { items: unknown[]; total: number; owner_lenser_id: string };
    expect(data).toEqual({ items: [{ id: 't1', key: 'web_search' }], total: 1, owner_lenser_id: 'owner-1' });
    expect(env.meta.tool).toBe('list_agent_tool_catalog');
  });

  it('falls back to LENSERFIGHT_LENSER_ID env var', async () => {
    process.env.LENSERFIGHT_LENSER_ID = 'env-owner';
    (agentService.listToolCatalog as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerAgentListToolCatalog);
    await tool.handler({});
    expect(agentService.listToolCatalog).toHaveBeenCalledWith(expect.anything(), { owner_lenser_id: 'env-owner' });
    delete process.env.LENSERFIGHT_LENSER_ID;
  });

  it('maps McpError to fail envelope', async () => {
    (agentService.listToolCatalog as jest.Mock).mockRejectedValue(new McpError('FORBIDDEN', 'nope'));
    const tool = captureTool(registerAgentListToolCatalog);
    const env = parseEnvelope(await tool.handler({ owner_lenser_id: 'x' }));
    expect(env.success).toBe(false);
    expect(env.error?.code).toBe('FORBIDDEN');
  });
});
