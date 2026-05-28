import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerBattleScore(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'battle_score',
    'Read scoring data for a battle: vote aggregates per contender and any AI judge verdicts.',
    {
      battle_id: z.string().uuid(),
    },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_score' as never, {
          p_battle_id: battle_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'battle_score', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_score', t0);
      }
    }
  );
}
