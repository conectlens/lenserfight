import { workflowService } from '../../services/workflow.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowRetry } from './workflow-retry';

jest.mock('../../services/workflow.service', () => ({ workflowService: { retry: jest.fn() } }));

describe('retry_workflow tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('rewrites NOT_FOUND with run_id', async () => {
    (workflowService.retry as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'gone'));
    const tool = captureTool(registerWorkflowRetry);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    expect(env.error?.message).toContain('r1');
  });

  it('returns the new-run data on success', async () => {
    (workflowService.retry as jest.Mock).mockResolvedValue({ new_run: { id: 'r2' }, original_run_id: 'r1' });
    const tool = captureTool(registerWorkflowRetry);
    const env = parseEnvelope(await tool.handler({ run_id: 'r1' }));
    const data = env.data as { original_run_id: string };
    expect(data.original_run_id).toBe('r1');
  });
});
