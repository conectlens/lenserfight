import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensCreate } from './lens-create';

jest.mock('../../services/lens.service', () => ({ lensService: { create: jest.fn() } }));

describe('create_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('normalizes params with optional defaulting to false', async () => {
    (lensService.create as jest.Mock).mockResolvedValue({ id: 'l1' });
    const tool = captureTool(registerLensCreate);
    await tool.handler({
      title: 'T',
      template_body: 'x'.repeat(60),
      params: [{ label: 'A' }, { label: 'B', optional: true }],
    });
    expect(lensService.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      params: [{ label: 'A', optional: false }, { label: 'B', optional: true }],
      visibility: 'public',
    }));
  });

  it('wraps result data', async () => {
    (lensService.create as jest.Mock).mockResolvedValue({ id: 'l1' });
    const tool = captureTool(registerLensCreate);
    const env = parseEnvelope(await tool.handler({ title: 'T', template_body: 'x'.repeat(60) }));
    expect(env.data).toEqual({ id: 'l1' });
  });
});
