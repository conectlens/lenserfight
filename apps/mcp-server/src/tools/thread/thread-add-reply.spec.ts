import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { McpError } from '../../services/mcp-error';
import { threadService } from '../../services/thread.service';

import { registerThreadAddReply } from './thread-add-reply';

jest.mock('../../services/thread.service', () => ({ threadService: { addReply: jest.fn() } }));

describe('add_thread_reply tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults parent_reply_id to null for a top-level reply', async () => {
    (threadService.addReply as jest.Mock).mockResolvedValue({ id: 'r1', lenser_id: 'l1' });
    const tool = captureTool(registerThreadAddReply);
    await tool.handler({ thread_id: 't1', content: 'Hello' });
    expect(threadService.addReply).toHaveBeenCalledWith(expect.anything(), {
      thread_id: 't1',
      content: 'Hello',
      parent_reply_id: null,
    });
  });

  it('forwards parent_reply_id when nesting a reply', async () => {
    (threadService.addReply as jest.Mock).mockResolvedValue({ id: 'r2', lenser_id: 'l1' });
    const tool = captureTool(registerThreadAddReply);
    await tool.handler({ thread_id: 't1', content: 'Reply', parent_reply_id: 'r1' });
    expect(threadService.addReply).toHaveBeenCalledWith(expect.anything(), {
      thread_id: 't1',
      content: 'Reply',
      parent_reply_id: 'r1',
    });
  });

  it('wraps the created reply id and author', async () => {
    (threadService.addReply as jest.Mock).mockResolvedValue({ id: 'r1', lenser_id: 'l1' });
    const tool = captureTool(registerThreadAddReply);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1', content: 'Hello' }));
    expect(env.data).toEqual({ id: 'r1', lenser_id: 'l1' });
  });

  it('maps McpError to a typed failure envelope', async () => {
    (threadService.addReply as jest.Mock).mockRejectedValue(new McpError('UNAUTHENTICATED', 'nope'));
    const tool = captureTool(registerThreadAddReply);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1', content: 'Hello' }));
    expect(env.success).toBe(false);
    expect(env.error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
