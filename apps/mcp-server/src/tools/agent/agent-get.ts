import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'get_ai_lenser',
    'Get the full profile of one AI Lenser (AI Agent): handle, display_name, status, model binding, personality, policy summary, and ownership. Use list_ai_lensers first to discover ai_lenser_id.',
    {
      ai_lenser_id: zUuid,
    },
    async ({ ai_lenser_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_get_agent_profile' as never, {
          p_ai_lenser_id: ai_lenser_id,
        })) as unknown as {
          data: unknown;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `AI Lenser ${ai_lenser_id} not found`, {}, 'get_ai_lenser', t0);
        return ok(data, 'get_ai_lenser', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'get_ai_lenser', t0);
      }
    }
  );
}
