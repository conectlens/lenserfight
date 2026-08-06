import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution/catalog';

import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowDescribeNodeType } from './workflow-describe-node-type';

describe('describe_workflow_node_type tool', () => {
  it('NOT_FOUND for a type that does not exist in the catalog', async () => {
    const tool = captureTool(registerWorkflowDescribeNodeType);
    const env = parseEnvelope(await tool.handler({ type: 'not_a_real_node_type' }));

    expect(env.success).toBe(false);
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(env.error?.message).toContain('not_a_real_node_type');
  });

  it('describes a known node type with its full config schema', async () => {
    const entry = getWorkflowNodeCatalogEntry('lens_execute');
    const tool = captureTool(registerWorkflowDescribeNodeType);
    const env = parseEnvelope(await tool.handler({ type: 'lens_execute' }));

    expect(env.success).toBe(true);
    const data = env.data as Record<string, unknown>;
    expect(data.type).toBe('lens_execute');
    expect(data.display_name).toBe(entry?.displayName);
    expect(data.category).toBe('ai_primitive');
    expect(data.required_config).toEqual(
      entry?.requiredConfig.map((f) => ({
        key: f.key,
        label: f.label,
        kind: f.kind,
        required: f.required ?? false,
        default_value: f.defaultValue,
        options: f.options,
        description: f.description,
      }))
    );
    expect(data.docs_link).toBe(entry?.docsLink);
  });

  it('omits frontend-only presentation fields and n8n interop metadata', async () => {
    const tool = captureTool(registerWorkflowDescribeNodeType);
    const env = parseEnvelope(await tool.handler({ type: 'lens_execute' }));

    const data = env.data as Record<string, unknown>;
    expect(data).not.toHaveProperty('iconKey');
    expect(data).not.toHaveProperty('iconName');
    expect(data).not.toHaveProperty('color');
    expect(data).not.toHaveProperty('n8nMapping');
    expect(data).not.toHaveProperty('n8nEquivalent');
  });

  it('describes a trigger node type', async () => {
    const tool = captureTool(registerWorkflowDescribeNodeType);
    const env = parseEnvelope(await tool.handler({ type: 'schedule_trigger' }));

    expect(env.success).toBe(true);
    const data = env.data as Record<string, unknown>;
    expect(data.category).toBe('trigger');
  });
});
