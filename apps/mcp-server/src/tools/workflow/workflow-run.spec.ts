import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowRun } from './workflow-run';

jest.mock('../../services/workflow.service', () => ({ workflowService: { startRun: jest.fn() } }));

describe('run_workflow tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('stamps mcp_tool metadata and defaults', async () => {
    (workflowService.startRun as jest.Mock).mockResolvedValue({ id: 'run1' });
    const tool = captureTool(registerWorkflowRun);
    await tool.handler({ workflow_id: 'w1' });
    expect(workflowService.startRun).toHaveBeenCalledWith(expect.anything(), {
      workflow_id: 'w1', inputs: {}, global_model_id: null, idempotency_key: null,
      metadata: { mcp_tool: 'run_workflow' },
    });
  });

  it('returns data spread with workflow_id added', async () => {
    (workflowService.startRun as jest.Mock).mockResolvedValue({ id: 'run1', status: 'pending' });
    const tool = captureTool(registerWorkflowRun);
    const env = parseEnvelope(await tool.handler({ workflow_id: 'w1' }));
    expect(env.data).toEqual({ id: 'run1', status: 'pending', workflow_id: 'w1' });
  });
});
