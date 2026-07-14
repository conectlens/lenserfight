import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';
import { p } from '../tool-params.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('get_workflow_graph');
const TOOL = meta.name;

export function registerWorkflowGetGraph(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    { workflow_id: p.workflow_id },
    async ({ workflow_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.getGraph(sb, workflow_id);
        if (!data) return fail('NOT_FOUND', `Workflow ${workflow_id} not found or not visible`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
