import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { threadService } from '../../services/thread.service';

import { registerThreadListReplies } from './thread-list-replies';

jest.mock('../../services/thread.service', () => ({ threadService: { listReplies: jest.fn() } }));

describe('list_thread_replies tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults limit to 20 and offset to 0', async () => {
    (threadService.listReplies as jest.Mock).mockResolvedValue([]);
    const tool = captureTool(registerThreadListReplies);
    await tool.handler({ thread_id: 't1' });
    expect(threadService.listReplies).toHaveBeenCalledWith(expect.anything(), {
      thread_id: 't1',
      limit: 20,
      offset: 0,
    });
  });

  it('sets has_more when a full page is returned', async () => {
    (threadService.listReplies as jest.Mock).mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
    const tool = captureTool(registerThreadListReplies);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1', limit: 2 }));
    expect(env.data).toEqual({ items: [{ id: 'r1' }, { id: 'r2' }], limit: 2, offset: 0, has_more: true });
  });

  it('sets has_more false on a short page', async () => {
    (threadService.listReplies as jest.Mock).mockResolvedValue([{ id: 'r1' }]);
    const tool = captureTool(registerThreadListReplies);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1', limit: 20 }));
    expect(env.data).toMatchObject({ has_more: false });
  });
});
