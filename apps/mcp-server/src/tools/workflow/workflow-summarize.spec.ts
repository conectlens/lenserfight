import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowSummarize } from './workflow-summarize';

jest.mock('../../services/workflow.service', () => ({ workflowService: { summarize: jest.fn() } }));

describe('summarize_workflow tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when service returns null', async () => {
    (workflowService.summarize as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerWorkflowSummarize);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
  });

  it('wraps summary payload', async () => {
    (workflowService.summarize as jest.Mock).mockResolvedValue({ run_id: 'r1', status: 'completed', duration_ms: 1000 });
    const tool = captureTool(registerWorkflowSummarize);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    const data = env.data as { duration_ms: number };
    expect(data.duration_ms).toBe(1000);
  });
});
