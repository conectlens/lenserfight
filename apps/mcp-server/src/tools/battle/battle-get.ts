import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerBattleGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'get_battle',
    'Get a battle with its contenders, vote aggregates, and submissions.',
    {
      battle_id: zUuid,
    },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_get' as never, {
          p_battle_id: battle_id,
        })) as unknown as { data: unknown; error: { message: string } | null };

        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Battle ${battle_id} not found`, {}, 'get_battle', t0);
        return ok(data, 'get_battle', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'get_battle', t0);
      }
    }
  );
}
