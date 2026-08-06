import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { threadService } from '../../services/thread.service';

import { registerThreadGet } from './thread-get';

jest.mock('../../services/thread.service', () => ({ threadService: { get: jest.fn() } }));

describe('get_thread tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns NOT_FOUND when the thread does not exist or is not owned', async () => {
    (threadService.get as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerThreadGet);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1' }));
    expect(env.success).toBe(false);
    expect(env.error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the hydrated thread', async () => {
    (threadService.get as jest.Mock).mockResolvedValue({ id: 't1', title: 'Hello', content: 'World' });
    const tool = captureTool(registerThreadGet);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1' }));
    expect(env.data).toEqual({ id: 't1', title: 'Hello', content: 'World' });
  });
});
