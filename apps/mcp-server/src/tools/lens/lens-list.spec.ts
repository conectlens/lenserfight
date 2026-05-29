import { lensService } from '../../services/lens.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensList } from './lens-list';

jest.mock('../../services/lens.service', () => ({ lensService: { list: jest.fn() } }));

describe('list_lenses tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('delegates to lensService.list and wraps paginated envelope', async () => {
    (lensService.list as jest.Mock).mockResolvedValue({ items: [{ id: 'a' }], total: 1 });
    const tool = captureTool(registerLensList);
    const env = parseEnvelope(await tool.handler({}));
    expect(env.success).toBe(true);
    const data = env.data as { items: unknown[]; total: number; limit: number; offset: number; has_more: boolean };
    expect(data.items).toEqual([{ id: 'a' }]);
    expect(data.total).toBe(1);
    expect(data.limit).toBe(20);
    expect(data.has_more).toBe(false);
  });

  it('forwards filters to service', async () => {
    (lensService.list as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerLensList);
    await tool.handler({ limit: 5, offset: 10, visibility: 'public', include_archived: true });
    expect(lensService.list).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      limit: 5, offset: 10, visibility: 'public', include_archived: true,
    }));
  });

  it('maps McpError to fail', async () => {
    (lensService.list as jest.Mock).mockRejectedValue(new McpError('FORBIDDEN', 'nope'));
    const tool = captureTool(registerLensList);
    const env = parseEnvelope(await tool.handler({}));
    expect(env.error?.code).toBe('FORBIDDEN');
  });
});
