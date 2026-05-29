import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_workflow';

export function registerWorkflowGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Get a workflow with its head version and scheduling info.',
    { workflow_id: zUuid },
    async ({ workflow_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.get(sb, workflow_id);
        if (!data) return fail('NOT_FOUND', `Workflow ${workflow_id} not found`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
