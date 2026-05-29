import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensGetVersion } from './lens-get-version';

jest.mock('../../services/lens.service', () => ({ lensService: { getVersion: jest.fn() } }));

describe('get_lens_version tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns BAD_INPUT when neither version_id nor semver is given', async () => {
    const tool = captureTool(registerLensGetVersion);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.error?.code).toBe('BAD_INPUT');
    expect(lensService.getVersion).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when service returns null', async () => {
    (lensService.getVersion as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerLensGetVersion);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', semver: '1.0.0' }));
    expect(env.error?.code).toBe('NOT_FOUND');
  });

  it('returns ok with version data when found', async () => {
    (lensService.getVersion as jest.Mock).mockResolvedValue({ id: 'v1', semver: '1.0.0' });
    const tool = captureTool(registerLensGetVersion);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', version_id: 'v1' }));
    expect(env.data).toEqual({ id: 'v1', semver: '1.0.0' });
  });
});
