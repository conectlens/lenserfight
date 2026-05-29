import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensExtractParams } from './lens-extract-params';

jest.mock('../../services/lens.service', () => ({ lensService: { resolveTemplate: jest.fn() } }));

describe('extract_lens_params tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when service returns null', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerLensExtractParams);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
  });

  it('extracts unique raw_tokens from template_body', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v1',
      template_body: 'Hello [[Name]] and [[Name]] in [[Lang!]]',
      parameters: [{ id: 'p1', label: 'Name', optional: false }],
    });
    const tool = captureTool(registerLensExtractParams);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    const data = env.data as { raw_tokens_in_template: string[]; params: unknown[]; lens_id: string };
    expect(data.raw_tokens_in_template).toEqual(['Name', 'Lang']);
    expect(data.lens_id).toBe('l1');
  });
});
