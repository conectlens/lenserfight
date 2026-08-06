import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { WORKFLOW_NODE_CATALOG, WORKFLOW_NODE_CATEGORIES } from '@lenserfight/infra/execution/catalog';

import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { ok } from '../../types.js';

const meta = getToolMeta('list_workflow_node_types');
const TOOL = meta.name;

export function registerWorkflowListNodeTypes(server: McpServer): void {
  registerMcpTool(
    server,
    meta,
    {
      category: z
        .string()
        .min(1)
        .optional()
        .describe(`Filter to one catalog category: ${WORKFLOW_NODE_CATEGORIES.join(', ')}.`),
    },
    async ({ category }) => {
      const t0 = Date.now();
      const entries = category
        ? WORKFLOW_NODE_CATALOG.filter((entry) => entry.category === category)
        : WORKFLOW_NODE_CATALOG;

      const items = entries.map((entry) => ({
        type: entry.type,
        category: entry.category,
        display_name: entry.displayName,
        description: entry.description,
        capabilities: entry.capabilities,
      }));

      return ok({ items, total: items.length, categories: WORKFLOW_NODE_CATEGORIES }, TOOL, t0);
    }
  );
}
