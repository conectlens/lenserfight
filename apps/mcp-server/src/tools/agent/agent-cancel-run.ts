import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'cancel_agent_run';

export function registerAgentCancelRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Cancel an in-flight team run for an AI Lenser. The run transitions to "cancelled"; any pending tool invocations are aborted. Already-completed runs are a no-op.',
    { team_run_id: zUuid, ai_lenser_id: zUuid },
    async ({ team_run_id, ai_lenser_id }) => {
      const t0 = Date.now();
      try {
        await agentService.cancelRun(sb, { team_run_id, ai_lenser_id });
        return ok({ team_run_id, ai_lenser_id, cancelled: true }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `Team run ${team_run_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
