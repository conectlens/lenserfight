import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_workflow_run_logs';

export function registerWorkflowRunLogs(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Get execution logs and node outputs for a workflow run, ordered by time.',
    { run_id: zUuid },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.runLogs(sb, run_id);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
