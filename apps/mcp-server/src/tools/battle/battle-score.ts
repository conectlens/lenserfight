import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerBattleScore(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'get_battle_score',
    'Read scoring data for a battle: vote aggregates per contender and any AI judge verdicts.',
    {
      battle_id: zUuid,
    },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_score' as never, {
          p_battle_id: battle_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'get_battle_score', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'get_battle_score', t0);
      }
    }
  );
}
