import { composeLensPayload } from '@lenserfight/api/export-payloads';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensExport } from './lens-export';

jest.mock('@lenserfight/api/export-payloads', () => ({ composeLensPayload: jest.fn() }));

describe('export_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('wraps the rendered export content in an ok envelope', async () => {
    (composeLensPayload as jest.Mock).mockResolvedValue({
      id: 'l1',
      slug: 'l1',
      title: 'Market Brief',
      body: 'Produce a brief for [[topic]].',
      version: '1.0.0',
      tags: [],
      parameters: [{ label: 'topic', type: 'string', required: true }],
    });

    const tool = captureTool(registerLensExport);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', export_format: 'json' }));

    expect(env.success).toBe(true);
    const data = env.data as { content: string; filename: string; checksum: string };
    expect(typeof data.content).toBe('string');
    const envelope = JSON.parse(data.content);
    expect(envelope.kind).toBe('lens');
    expect(envelope.data).toMatchObject({ id: 'l1', title: 'Market Brief' });
    expect(envelope.checksum).toBe(data.checksum);
    expect(data.filename).toMatch(/\.json$/);
    expect(data.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns DB_ERROR when composeLensPayload throws', async () => {
    (composeLensPayload as jest.Mock).mockRejectedValue(new Error('lens not found'));

    const tool = captureTool(registerLensExport);
    const env = parseEnvelope(await tool.handler({ lens_id: 'missing', export_format: 'markdown' }));

    expect(env.success).toBe(false);
    expect(env.error?.message).toContain('lens not found');
  });
});
