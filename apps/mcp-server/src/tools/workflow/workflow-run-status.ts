import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRunStatus(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'workflow_run_status',
    'Get the current status and progress of a workflow run. Includes cost breakdown and active node.',
    {
      run_id: z.string().uuid(),
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_run_status' as never, {
          p_run_id: run_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_run_status', t0);
        return ok(data, 'workflow_run_status', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_run_status', t0);
      }
    }
  );
}
