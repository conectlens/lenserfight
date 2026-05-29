import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensFork } from './lens-fork';

jest.mock('../../services/lens.service', () => ({
  lensService: { resolveTemplate: jest.fn(), create: jest.fn() },
}));

describe('fork_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when source has no template and no override is supplied', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerLensFork);
    const env = parseEnvelope(await tool.handler({ source_lens_id: 's1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(lensService.create).not.toHaveBeenCalled();
  });

  it('skips resolveTemplate when template_body override is provided', async () => {
    (lensService.create as jest.Mock).mockResolvedValue({ id: 'fork1' });
    const tool = captureTool(registerLensFork);
    await tool.handler({ source_lens_id: 's1', template_body: 'x'.repeat(60) });
    expect(lensService.resolveTemplate).not.toHaveBeenCalled();
    expect(lensService.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      parent_lens_id: 's1', visibility: 'public',
    }));
  });

  it('uses default title "Fork of <id>"', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({ template_body: 'x'.repeat(60), parameters: [] });
    (lensService.create as jest.Mock).mockResolvedValue({ id: 'fork1' });
    const tool = captureTool(registerLensFork);
    await tool.handler({ source_lens_id: 's1' });
    expect(lensService.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      title: 'Fork of s1',
    }));
  });
});
