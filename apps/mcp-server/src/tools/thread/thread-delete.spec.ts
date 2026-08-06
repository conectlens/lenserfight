import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { threadService } from '../../services/thread.service';

import { registerThreadDelete } from './thread-delete';

jest.mock('../../services/thread.service', () => ({ threadService: { delete: jest.fn() } }));

describe('delete_thread tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns deleted=true on success', async () => {
    (threadService.delete as jest.Mock).mockResolvedValue(undefined);
    const tool = captureTool(registerThreadDelete);
    const env = parseEnvelope(await tool.handler({ thread_id: 't1', confirm: true }));
    expect(env.data).toEqual({ thread_id: 't1', deleted: true });
  });
});
