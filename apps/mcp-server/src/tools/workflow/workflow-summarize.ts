import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerWorkflowSummarize(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'summarize_workflow',
    'Summarize a completed workflow run: status, cost, duration, and key output counts.',
    {
      run_id: zUuid,
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_summarize' as never, {
          p_run_id: run_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'summarize_workflow', t0);
        return ok(data, 'summarize_workflow', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'summarize_workflow', t0);
      }
    }
  );
}
