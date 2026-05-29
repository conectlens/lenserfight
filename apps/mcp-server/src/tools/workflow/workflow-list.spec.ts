import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowList } from './workflow-list';

jest.mock('../../services/workflow.service', () => ({ workflowService: { list: jest.fn() } }));

describe('list_workflows tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('forwards filters and wraps paginated envelope', async () => {
    (workflowService.list as jest.Mock).mockResolvedValue({ items: [{ id: 'w1' }], total: 1 });
    const tool = captureTool(registerWorkflowList);
    const env = parseEnvelope(await tool.handler({ visibility: 'public' }));
    expect(workflowService.list).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      limit: 20, offset: 0, visibility: 'public',
    }));
    const data = env.data as { items: unknown[]; total: number };
    expect(data.total).toBe(1);
  });
});
