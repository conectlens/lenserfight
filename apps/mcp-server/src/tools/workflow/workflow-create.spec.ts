import { workflowService } from '../../services/workflow.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowCreate } from './workflow-create';

jest.mock('../../services/workflow.service', () => ({ workflowService: { create: jest.fn() } }));
jest.mock('../../config', () => ({ getConfig: () => ({ lenserId: null }) }));

const VALID_UUID = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('create_workflow tool', () => {
  const originalEnv = process.env.LENSERFIGHT_LENSER_ID;
  beforeEach(() => jest.resetAllMocks());
  afterEach(() => {
    if (originalEnv) process.env.LENSERFIGHT_LENSER_ID = originalEnv;
    else delete process.env.LENSERFIGHT_LENSER_ID;
  });

  it('MISSING_LENSER when neither arg nor env is set', async () => {
    delete process.env.LENSERFIGHT_LENSER_ID;
    const tool = captureTool(registerWorkflowCreate);
    const env = parseEnvelope(await tool.handler({ title: 'T' }));
    expect(env.error?.code).toBe('MISSING_LENSER');
    expect(workflowService.create).not.toHaveBeenCalled();
  });

  it('forwards explicit lenser_id and defaults visibility=private', async () => {
    (workflowService.create as jest.Mock).mockResolvedValue({ id: 'w1' });
    const tool = captureTool(registerWorkflowCreate);
    await tool.handler({ title: 'T', lenser_id: VALID_UUID });
    expect(workflowService.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      lenser_id: VALID_UUID, visibility: 'private', description: null,
    }));
  });

  it('maps MISSING_LENSER McpError from service', async () => {
    (workflowService.create as jest.Mock).mockRejectedValue(new McpError('MISSING_LENSER', 'no'));
    const tool = captureTool(registerWorkflowCreate);
    const env = parseEnvelope(await tool.handler({ title: 'T', lenser_id: VALID_UUID }));
    expect(env.error?.code).toBe('MISSING_LENSER');
  });
});
