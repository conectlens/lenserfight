import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensDelete } from './lens-delete';

jest.mock('../../services/lens.service', () => ({ lensService: { delete: jest.fn() } }));

describe('delete_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns deleted=true and spreads service data', async () => {
    (lensService.delete as jest.Mock).mockResolvedValue({ deleted_at: 'now' });
    const tool = captureTool(registerLensDelete);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', confirm: true }));
    expect(env.data).toEqual({ deleted: true, deleted_at: 'now' });
  });

  it('handles null service data', async () => {
    (lensService.delete as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerLensDelete);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', confirm: true }));
    expect(env.data).toEqual({ deleted: true });
  });
});
