import { agentService } from '../../services/agent.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentCreate } from './agent-create';

jest.mock('../../services/agent.service', () => ({ agentService: { create: jest.fn() } }));

const VALID_UUID = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('create_ai_lenser tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns MISSING_LENSER when owner is missing', async () => {
    delete process.env.LENSERFIGHT_LENSER_ID;
    const tool = captureTool(registerAgentCreate);
    const env = parseEnvelope(await tool.handler({ handle: 'h', display_name: 'd' }));
    expect(env.error?.code).toBe('MISSING_LENSER');
  });

  it('enriches CONFLICT error with the offending handle', async () => {
    (agentService.create as jest.Mock).mockRejectedValue(new McpError('CONFLICT', 'taken'));
    const tool = captureTool(registerAgentCreate);
    const env = parseEnvelope(
      await tool.handler({ handle: 'duped', display_name: 'D', owner_lenser_id: VALID_UUID })
    );
    expect(env.error?.code).toBe('CONFLICT');
    expect(env.error?.message).toContain('@duped');
    expect(env.error?.details).toEqual({ handle: 'duped' });
  });

  it('passes ai_model_id null when omitted', async () => {
    (agentService.create as jest.Mock).mockResolvedValue({ id: 'a1' });
    const tool = captureTool(registerAgentCreate);
    await tool.handler({ handle: 'h', display_name: 'd', owner_lenser_id: VALID_UUID });
    expect(agentService.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ai_model_id: null }));
  });
});
