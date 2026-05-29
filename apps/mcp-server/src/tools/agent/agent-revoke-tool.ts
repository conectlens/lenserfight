import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentRevokeTool(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'revoke_agent_tool',
    'Revoke a tool assignment from an AI Lenser. The assignment row is removed; in-flight invocations of this tool fail with a permission error. Returns true on revoke, false if there was no assignment.',
    {
      ai_lenser_id: zUuid,
      tool_id: zUuid,
    },
    async ({ ai_lenser_id, tool_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_revoke_tool' as never, {
          p_ai_lenser_id: ai_lenser_id,
          p_tool_id: tool_id,
        })) as unknown as {
          data: boolean | null;
          error: { message: string } | null;
        };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'revoke_agent_tool', t0);
          }
          throw new Error(error.message);
        }
        return ok({ ai_lenser_id, tool_id, revoked: data === true }, 'revoke_agent_tool', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'revoke_agent_tool', t0);
      }
    }
  );
}
