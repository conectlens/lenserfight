import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { threadService } from '../../services/thread.service';

import { registerThreadListMine } from './thread-list-mine';

jest.mock('../../services/thread.service', () => ({ threadService: { listMine: jest.fn() } }));

describe('list_my_threads tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults limit to 20 and offset to 0', async () => {
    (threadService.listMine as jest.Mock).mockResolvedValue([]);
    const tool = captureTool(registerThreadListMine);
    await tool.handler({});
    expect(threadService.listMine).toHaveBeenCalledWith(expect.anything(), { limit: 20, offset: 0 });
  });

  it('sets has_more when a full page is returned', async () => {
    (threadService.listMine as jest.Mock).mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    const tool = captureTool(registerThreadListMine);
    const env = parseEnvelope(await tool.handler({ limit: 2 }));
    expect(env.data).toEqual({ items: [{ id: 't1' }, { id: 't2' }], limit: 2, offset: 0, has_more: true });
  });

  it('sets has_more false on a short page', async () => {
    (threadService.listMine as jest.Mock).mockResolvedValue([{ id: 't1' }]);
    const tool = captureTool(registerThreadListMine);
    const env = parseEnvelope(await tool.handler({ limit: 20 }));
    expect(env.data).toMatchObject({ has_more: false });
  });
});
