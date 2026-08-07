import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { threadService } from '../../services/thread.service';

import { registerThreadDeleteReply } from './thread-delete-reply';

jest.mock('../../services/thread.service', () => ({ threadService: { deleteReply: jest.fn() } }));

describe('delete_thread_reply tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns deleted=true on success', async () => {
    (threadService.deleteReply as jest.Mock).mockResolvedValue(undefined);
    const tool = captureTool(registerThreadDeleteReply);
    const env = parseEnvelope(await tool.handler({ reply_id: 'r1', confirm: true }));
    expect(env.data).toEqual({ reply_id: 'r1', deleted: true });
  });
});
