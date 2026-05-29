import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensValidateParams } from './lens-validate-params';

jest.mock('../../services/lens.service', () => ({ lensService: { resolveTemplate: jest.fn() } }));

describe('validate_lens_params tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('valid=true when all required supplied and no unknown', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      template_body: '', parameters: [{ id: 'p1', label: 'A', optional: false }],
    });
    const tool = captureTool(registerLensValidateParams);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', values: { a: 'x' } }));
    const data = env.data as { valid: boolean; missing: string[]; unknown: string[] };
    expect(data.valid).toBe(true);
    expect(data.missing).toEqual([]);
    expect(data.unknown).toEqual([]);
  });

  it('flags missing required + unknown extras', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      template_body: '', parameters: [
        { id: 'p1', label: 'A', optional: false },
        { id: 'p2', label: 'B', optional: true },
      ],
    });
    const tool = captureTool(registerLensValidateParams);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', values: { C: 'x' } }));
    const data = env.data as { valid: boolean; missing: string[]; unknown: string[] };
    expect(data.valid).toBe(false);
    expect(data.missing).toEqual(['A']);
    expect(data.unknown).toEqual(['C']);
  });
});
