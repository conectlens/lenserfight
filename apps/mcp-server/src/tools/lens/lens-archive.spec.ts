import { lensService } from '../../services/lens.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensArchive } from './lens-archive';

jest.mock('../../services/lens.service', () => ({ lensService: { archive: jest.fn() } }));

describe('archive_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('forwards lens_id to service', async () => {
    (lensService.archive as jest.Mock).mockResolvedValue({ ok: true });
    const tool = captureTool(registerLensArchive);
    await tool.handler({ lens_id: 'l1' });
    expect(lensService.archive).toHaveBeenCalledWith(expect.anything(), 'l1');
  });

  it('rewrites NOT_FOUND with lens_id', async () => {
    (lensService.archive as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'gone'));
    const tool = captureTool(registerLensArchive);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.error?.message).toContain('l1');
  });
});
