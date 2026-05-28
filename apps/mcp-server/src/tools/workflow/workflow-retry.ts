import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRetry(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'workflow_retry',
    'Retry a failed or cancelled workflow run with the same inputs. Creates a new run linked to the original via parent_run_id.',
    {
      run_id: z.string().uuid(),
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_retry' as never, {
          p_run_id: run_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('run_not_found')) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_retry', t0);
          throw new Error(error.message);
        }
        return ok(data, 'workflow_retry', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_retry', t0);
      }
    }
  );
}
