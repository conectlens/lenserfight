import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { McpError } from '../../services/mcp-error';
import { threadService } from '../../services/thread.service';

import { registerThreadCreate } from './thread-create';

jest.mock('../../services/thread.service', () => ({ threadService: { create: jest.fn() } }));

describe('create_thread tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults visibility to public and tag_ids to an empty array', async () => {
    (threadService.create as jest.Mock).mockResolvedValue({ id: 't1' });
    const tool = captureTool(registerThreadCreate);
    await tool.handler({ title: 'T', content: 'C' });
    expect(threadService.create).toHaveBeenCalledWith(
      expect.anything(),
      { title: 'T', content: 'C', visibility: 'public', tag_ids: [] }
    );
  });

  it('wraps the created thread id', async () => {
    (threadService.create as jest.Mock).mockResolvedValue({ id: 't1' });
    const tool = captureTool(registerThreadCreate);
    const env = parseEnvelope(await tool.handler({ title: 'T', content: 'C' }));
    expect(env.data).toEqual({ id: 't1' });
  });

  it('maps McpError to a typed failure envelope', async () => {
    (threadService.create as jest.Mock).mockRejectedValue(new McpError('UNAUTHENTICATED', 'nope'));
    const tool = captureTool(registerThreadCreate);
    const env = parseEnvelope(await tool.handler({ title: 'T', content: 'C' }));
    expect(env.success).toBe(false);
    expect(env.error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
