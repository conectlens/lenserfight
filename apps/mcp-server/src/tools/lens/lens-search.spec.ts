import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensSearch } from './lens-search';

jest.mock('../../services/lens.service', () => ({ lensService: { search: jest.fn() } }));

describe('search_lenses tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns paginated envelope with has_more=true when more results exist', async () => {
    (lensService.search as jest.Mock).mockResolvedValue({ items: [{ id: 'a' }, { id: 'b' }], total: 50 });
    const tool = captureTool(registerLensSearch);
    const env = parseEnvelope(await tool.handler({ query: 'x', limit: 2 }));
    const data = env.data as { has_more: boolean; total: number };
    expect(data.has_more).toBe(true);
    expect(data.total).toBe(50);
  });

  it('uses defaults limit=20 offset=0', async () => {
    (lensService.search as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerLensSearch);
    await tool.handler({ query: 'x' });
    expect(lensService.search).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ limit: 20, offset: 0 }));
  });
});
