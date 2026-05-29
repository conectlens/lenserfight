import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentCancelRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'cancel_agent_run',
    'Cancel an in-flight team run for an AI Lenser. The run transitions to "cancelled"; any pending tool invocations are aborted. Already-completed runs are a no-op.',
    {
      team_run_id: zUuid,
      ai_lenser_id: zUuid,
    },
    async ({ team_run_id, ai_lenser_id }) => {
      const t0 = Date.now();
      try {
        const { error } = (await sb.rpc('fn_cancel_agent_run' as never, {
          p_team_run_id: team_run_id,
          p_ai_lenser_id: ai_lenser_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'cancel_agent_run', t0);
          }
          if (error.message?.includes('not_found')) {
            return fail('NOT_FOUND', `Team run ${team_run_id} not found`, {}, 'cancel_agent_run', t0);
          }
          throw new Error(error.message);
        }
        return ok({ team_run_id, ai_lenser_id, cancelled: true }, 'cancel_agent_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'cancel_agent_run', t0);
      }
    }
  );
}
