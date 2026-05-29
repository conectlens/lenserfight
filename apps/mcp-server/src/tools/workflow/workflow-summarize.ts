import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'summarize_workflow';

export function registerWorkflowSummarize(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Summarize a completed workflow run: status, cost, duration, and key output counts.',
    { run_id: zUuid },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.summarize(sb, run_id);
        if (!data) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
