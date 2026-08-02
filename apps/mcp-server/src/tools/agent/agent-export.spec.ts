import { composeAgentPayload } from '@lenserfight/api/export-payloads';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerAgentExport } from './agent-export';

jest.mock('@lenserfight/api/export-payloads', () => ({ composeAgentPayload: jest.fn() }));

describe('export_agent tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('wraps the rendered export content in an ok envelope', async () => {
    (composeAgentPayload as jest.Mock).mockResolvedValue({
      id: 'agent-1',
      ai_lenser_id: 'agent-1',
      handle: 'research-bot',
      display_name: 'Research Bot',
      is_active: true,
      can_join_battles: true,
      model_binding_mode: 'single',
    });

    const tool = captureTool(registerAgentExport);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'agent-1', export_format: 'markdown' }));

    expect(env.success).toBe(true);
    const data = env.data as { content: string; filename: string; checksum: string };
    expect(data.content).toContain('Research Bot');
    expect(data.content).toContain('@research-bot');
    expect(data.filename).toMatch(/\.md$/);
    expect(data.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns DB_ERROR when composeAgentPayload throws', async () => {
    (composeAgentPayload as jest.Mock).mockRejectedValue(new Error('agent not found'));

    const tool = captureTool(registerAgentExport);
    const env = parseEnvelope(await tool.handler({ ai_lenser_id: 'missing', export_format: 'json' }));

    expect(env.success).toBe(false);
    expect(env.error?.message).toContain('agent not found');
  });
});
