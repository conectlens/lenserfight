import { WORKFLOW_NODE_CATALOG } from '@lenserfight/infra/execution/catalog';

import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerWorkflowListNodeTypes } from './workflow-list-node-types';

describe('list_workflow_node_types tool', () => {
  it('returns every catalog entry when no category filter is given', async () => {
    const tool = captureTool(registerWorkflowListNodeTypes);
    const env = parseEnvelope(await tool.handler({}));

    expect(env.success).toBe(true);
    const data = env.data as { items: Array<{ type: string }>; total: number };
    expect(data.total).toBe(WORKFLOW_NODE_CATALOG.length);
    expect(data.items.map((i) => i.type).sort()).toEqual(
      WORKFLOW_NODE_CATALOG.map((e) => e.type).sort()
    );
  });

  it('filters by category', async () => {
    const tool = captureTool(registerWorkflowListNodeTypes);
    const env = parseEnvelope(await tool.handler({ category: 'trigger' }));

    const data = env.data as { items: Array<{ type: string; category: string }>; total: number };
    const expectedCount = WORKFLOW_NODE_CATALOG.filter((e) => e.category === 'trigger').length;
    expect(data.total).toBe(expectedCount);
    expect(expectedCount).toBeGreaterThan(0);
    expect(data.items.every((i) => i.category === 'trigger')).toBe(true);
  });

  it('returns an empty list for a category with no matches, without erroring', async () => {
    const tool = captureTool(registerWorkflowListNodeTypes);
    const env = parseEnvelope(await tool.handler({ category: 'not_a_real_category' }));

    expect(env.success).toBe(true);
    const data = env.data as { items: unknown[]; total: number };
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('includes the full category list so a client can self-correct an unknown filter', async () => {
    const tool = captureTool(registerWorkflowListNodeTypes);
    const env = parseEnvelope(await tool.handler({}));

    const data = env.data as { categories: string[] };
    expect(data.categories).toContain('trigger');
    expect(data.categories).toContain('lens');
  });

  it('projects the slim summary shape, not the full catalog entry', async () => {
    const tool = captureTool(registerWorkflowListNodeTypes);
    const env = parseEnvelope(await tool.handler({ category: 'trigger' }));

    const data = env.data as { items: Array<Record<string, unknown>> };
    expect(Object.keys(data.items[0]).sort()).toEqual(
      ['capabilities', 'category', 'description', 'display_name', 'type'].sort()
    );
  });
});
