import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowRunLogs } from './workflow-run-logs';

jest.mock('../../services/workflow.service', () => ({ workflowService: { runLogs: jest.fn() } }));

describe('get_workflow_run_logs tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('wraps logs payload', async () => {
    (workflowService.runLogs as jest.Mock).mockResolvedValue({ run: { id: 'r1' }, node_results: [{ id: 'n1' }] });
    const tool = captureTool(registerWorkflowRunLogs);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    const data = env.data as { node_results: unknown[] };
    expect(data.node_results).toHaveLength(1);
  });
});
