import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensGet } from './lens-get';

jest.mock('../../services/lens.service', () => ({ lensService: { get: jest.fn() } }));

describe('get_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns NOT_FOUND when service returns null', async () => {
    (lensService.get as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerLensGet);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(env.error?.message).toContain('l1');
  });

  it('wraps data in ok envelope', async () => {
    (lensService.get as jest.Mock).mockResolvedValue({ id: 'l1', title: 'T' });
    const tool = captureTool(registerLensGet);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.data).toEqual({ id: 'l1', title: 'T' });
  });
});
