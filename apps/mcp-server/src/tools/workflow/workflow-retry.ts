import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'retry_workflow';

export function registerWorkflowRetry(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Retry a failed or cancelled workflow run with the same inputs. Creates a new run linked to the original via parent_run_id.',
    { run_id: zUuid },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.retry(sb, run_id);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `Run ${run_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
