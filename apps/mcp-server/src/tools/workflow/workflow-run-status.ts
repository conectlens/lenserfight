import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_workflow_run_status';

export function registerWorkflowRunStatus(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Get the current status and progress of a workflow run. Includes cost breakdown and active node.',
    { run_id: zUuid },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.runStatus(sb, run_id);
        if (!data) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
