import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensUpdate } from './lens-update';

jest.mock('../../services/lens.service', () => ({ lensService: { update: jest.fn() } }));

describe('update_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('passes only supplied fields to service (leaves others undefined)', async () => {
    (lensService.update as jest.Mock).mockResolvedValue({ ok: true });
    const tool = captureTool(registerLensUpdate);
    await tool.handler({ lens_id: 'l1', visibility: 'private' });
    expect(lensService.update).toHaveBeenCalledWith(expect.anything(), {
      lens_id: 'l1', template_body: undefined, visibility: 'private', params: undefined,
    });
  });

  it('normalizes params optional to false when omitted', async () => {
    (lensService.update as jest.Mock).mockResolvedValue({ ok: true });
    const tool = captureTool(registerLensUpdate);
    await tool.handler({ lens_id: 'l1', params: [{ label: 'L' }] });
    expect(lensService.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      params: [{ label: 'L', optional: false }],
    }));
  });

  it('wraps data in ok envelope', async () => {
    (lensService.update as jest.Mock).mockResolvedValue({ version_id: 'v2' });
    const tool = captureTool(registerLensUpdate);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.data).toEqual({ version_id: 'v2' });
  });
});
