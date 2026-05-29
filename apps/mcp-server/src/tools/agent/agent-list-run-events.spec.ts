import { agentService } from '../../services/agent.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentListRunEvents } from './agent-list-run-events';

jest.mock('../../services/agent.service', () => ({ agentService: { listRunEvents: jest.fn() } }));

describe('list_agent_run_events', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults limit=100 and null filters', async () => {
    (agentService.listRunEvents as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerAgentListRunEvents);
    await tool.handler({ ai_lenser_id: 'a1' });
    expect(agentService.listRunEvents).toHaveBeenCalledWith(expect.anything(), {
      ai_lenser_id: 'a1', run_id: null, event_type: null, limit: 100,
    });
  });

  it('passes through run_id and event_type filters', async () => {
    (agentService.listRunEvents as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerAgentListRunEvents);
    await tool.handler({ ai_lenser_id: 'a1', run_id: 'r1', event_type: 'tool_invoke', limit: 50 });
    expect(agentService.listRunEvents).toHaveBeenCalledWith(expect.anything(), {
      ai_lenser_id: 'a1', run_id: 'r1', event_type: 'tool_invoke', limit: 50,
    });
  });

  it('wraps items+total in ok envelope', async () => {
    (agentService.listRunEvents as jest.Mock).mockResolvedValue({ items: [{ id: 'e1' }], total: 1 });
    const tool = captureTool(registerAgentListRunEvents);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'a1' }));
    expect(env.success).toBe(true);
    expect(env.data).toEqual({ items: [{ id: 'e1' }], total: 1 });
  });
});
