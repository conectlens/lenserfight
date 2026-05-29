import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensVersions } from './lens-versions';

jest.mock('../../services/lens.service', () => ({ lensService: { listVersions: jest.fn() } }));

describe('list_lens_versions tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('wraps service result', async () => {
    (lensService.listVersions as jest.Mock).mockResolvedValue({ lens_id: 'l1', versions: [{ id: 'v1' }], count: 1 });
    const tool = captureTool(registerLensVersions);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    const data = env.data as { count: number };
    expect(data.count).toBe(1);
  });
});
