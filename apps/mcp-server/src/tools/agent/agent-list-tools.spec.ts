import { agentService } from '../../services/agent.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentListTools } from './agent-list-tools';

jest.mock('../../services/agent.service', () => ({ agentService: { listTools: jest.fn() } }));

describe('list_agent_tools tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('uses default limit 50 and null cursor', async () => {
    (agentService.listTools as jest.Mock).mockResolvedValue({ items: [], total: 0, next_cursor: null });
    const tool = captureTool(registerAgentListTools);
    await tool.handler({ ai_lenser_id: 'a1' });
    expect(agentService.listTools).toHaveBeenCalledWith(expect.anything(), {
      ai_lenser_id: 'a1', limit: 50, cursor: null,
    });
  });

  it('echoes the limit and next_cursor back in the data', async () => {
    (agentService.listTools as jest.Mock).mockResolvedValue({ items: [{ id: 't0' }], total: 1, next_cursor: 't0' });
    const tool = captureTool(registerAgentListTools);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1', limit: 1 }));
    const data = env.data as { items: unknown[]; limit: number; next_cursor: string | null };
    expect(data.limit).toBe(1);
    expect(data.next_cursor).toBe('t0');
  });
});
