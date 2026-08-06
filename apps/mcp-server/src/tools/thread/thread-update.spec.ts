import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { McpError } from '../../services/mcp-error';
import { threadService } from '../../services/thread.service';

import { registerThreadUpdate } from './thread-update';

jest.mock('../../services/thread.service', () => ({ threadService: { update: jest.fn() } }));

describe('update_thread tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('rejects when no updatable field is supplied', async () => {
    const tool = captureTool(registerThreadUpdate);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1' }));
    expect(env.success).toBe(false);
    expect(env.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(threadService.update).not.toHaveBeenCalled();
  });

  it('forwards the supplied fields', async () => {
    (threadService.update as jest.Mock).mockResolvedValue(undefined);
    const tool = captureTool(registerThreadUpdate);
    await tool.handler({ thread_id: 't1', visibility: 'private' });
    expect(threadService.update).toHaveBeenCalledWith(expect.anything(), {
      thread_id: 't1',
      title: undefined,
      content: undefined,
      visibility: 'private',
    });
  });

  it('reports a friendlier NOT_FOUND message', async () => {
    (threadService.update as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'raw message'));
    const tool = captureTool(registerThreadUpdate);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1', title: 'X', content: 'Y' }));
    expect(env.error).toMatchObject({ code: 'NOT_FOUND', message: 'Thread t1 not found' });
  });
});
