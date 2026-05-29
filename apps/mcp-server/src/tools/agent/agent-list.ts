import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentList(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'list_ai_lensers',
    'List AI Lensers (AI Agents) owned by a human lenser. Returns each agent\'s profile snapshot — id, handle, display_name, ai_model_id, status, created_at — so the caller can pick one to inspect or operate on. Pass owner_lenser_id to scope; defaults to LENSERFIGHT_LENSER_ID env var when omitted.',
    {
      owner_lenser_id: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const owner = args.owner_lenser_id ?? process.env.LENSERFIGHT_LENSER_ID;
      if (!owner) {
        return fail(
          'MISSING_LENSER',
          'owner_lenser_id required. Set LENSERFIGHT_LENSER_ID or pass owner_lenser_id.',
          {},
          'list_ai_lensers',
          t0
        );
      }
      try {
        const { data, error } = (await sb.rpc('fn_list_agents_by_owner' as never, {
          p_owner_lenser_id: owner,
        })) as unknown as {
          data: unknown[] | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        const items = data ?? [];
        return ok({ items, total: items.length, owner_lenser_id: owner }, 'list_ai_lensers', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'list_ai_lensers', t0);
      }
    }
  );
}
