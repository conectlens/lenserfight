import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerWorkflowRunLogs(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'get_workflow_run_logs',
    'Get execution logs and node outputs for a workflow run, ordered by time.',
    {
      run_id: zUuid,
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_run_logs' as never, {
          p_run_id: run_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data ?? { run: null, node_results: [] }, 'get_workflow_run_logs', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'get_workflow_run_logs', t0);
      }
    }
  );
}
