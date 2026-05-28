import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerBattleGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'battle_get',
    'Get a battle with its contenders, vote aggregates, and submissions.',
    {
      battle_id: z.string().uuid(),
    },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_get' as never, {
          p_battle_id: battle_id,
        })) as unknown as { data: unknown; error: { message: string } | null };

        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Battle ${battle_id} not found`, {}, 'battle_get', t0);
        return ok(data, 'battle_get', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_get', t0);
      }
    }
  );
}
