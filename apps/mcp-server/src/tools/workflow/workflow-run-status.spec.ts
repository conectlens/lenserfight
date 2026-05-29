import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowRunStatus } from './workflow-run-status';

jest.mock('../../services/workflow.service', () => ({ workflowService: { runStatus: jest.fn() } }));

describe('get_workflow_run_status tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when null', async () => {
    (workflowService.runStatus as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerWorkflowRunStatus);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(env.error?.message).toContain('r1');
  });

  it('wraps status data', async () => {
    (workflowService.runStatus as jest.Mock).mockResolvedValue({ id: 'r1', status: 'running' });
    const tool = captureTool(registerWorkflowRunStatus);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    expect(env.data).toEqual({ id: 'r1', status: 'running' });
  });
});
