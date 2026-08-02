import { composeWorkflowPayload } from '@lenserfight/api/export-payloads';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowExport } from './workflow-export';

jest.mock('@lenserfight/api/export-payloads', () => ({ composeWorkflowPayload: jest.fn() }));

describe('export_workflow tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('wraps the rendered export content in an ok envelope', async () => {
    (composeWorkflowPayload as jest.Mock).mockResolvedValue({
      id: 'wf-1',
      title: 'Research pipeline',
      description: 'Two-step flow',
      node_count: 1,
      nodes: [{ id: 'n1', ordinal: 0, label: 'Research', lens_id: 'lens-a', config: {} }],
      edges: [],
    });

    const tool = captureTool(registerWorkflowExport);
    const env = parseEnvelope(await tool.handler({ workflow_id: 'wf-1', export_format: 'yaml' }));

    expect(env.success).toBe(true);
    const data = env.data as { content: string; filename: string; checksum: string };
    expect(data.content).toContain('id: "wf-1"');
    expect(data.filename).toMatch(/\.yaml$/);
    expect(data.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns DB_ERROR when composeWorkflowPayload throws', async () => {
    (composeWorkflowPayload as jest.Mock).mockRejectedValue(new Error('workflow not found'));

    const tool = captureTool(registerWorkflowExport);
    const env = parseEnvelope(await tool.handler({ workflow_id: 'missing', export_format: 'json' }));

    expect(env.success).toBe(false);
    expect(env.error?.message).toContain('workflow not found');
  });
});
