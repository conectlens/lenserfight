import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensSetVisibility } from './lens-set-visibility';

jest.mock('../../services/lens.service', () => ({ lensService: { setVisibility: jest.fn() } }));

describe('set_lens_visibility tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('forwards lens_id and visibility', async () => {
    (lensService.setVisibility as jest.Mock).mockResolvedValue({ ok: true });
    const tool = captureTool(registerLensSetVisibility);
    await tool.handler({ lens_id: 'l1', visibility: 'private' });
    expect(lensService.setVisibility).toHaveBeenCalledWith(expect.anything(), { lens_id: 'l1', visibility: 'private' });
  });

  it('wraps result in ok envelope', async () => {
    (lensService.setVisibility as jest.Mock).mockResolvedValue({ lens_id: 'l1', visibility: 'public' });
    const tool = captureTool(registerLensSetVisibility);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', visibility: 'public' }));
    expect(env.data).toEqual({ lens_id: 'l1', visibility: 'public' });
  });
});
