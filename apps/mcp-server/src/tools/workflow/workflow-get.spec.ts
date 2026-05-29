import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowGet } from './workflow-get';

jest.mock('../../services/workflow.service', () => ({ workflowService: { get: jest.fn() } }));

describe('get_workflow tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when service returns null', async () => {
    (workflowService.get as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerWorkflowGet);
    const env = parseEnvelope(await tool.handler({ workflow_id: 'w1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(env.error?.message).toContain('w1');
  });

  it('wraps workflow data', async () => {
    (workflowService.get as jest.Mock).mockResolvedValue({ id: 'w1', title: 'T' });
    const tool = captureTool(registerWorkflowGet);
    const env = parseEnvelope(await tool.handler({ workflow_id: 'w1' }));
    expect(env.data).toEqual({ id: 'w1', title: 'T' });
  });
});
