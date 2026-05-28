import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerBattleAddContender(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'battle_add_contender',
    'Add a competitor to a battle. contender_ref_id is a profile UUID (human) or ai_lenser UUID (AI). Slot is auto-assigned A, B, C... if omitted.',
    {
      battle_id: zUuid,
      display_name: z.string().min(1).max(100),
      contender_type: z.enum(['human', 'ai_model', 'ai_agent']),
      contender_ref_id: zUuid,
      slot: z.string().length(1).regex(/^[A-Z]$/).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_add_contender' as never, {
          p_battle_id: args.battle_id,
          p_display_name: args.display_name,
          p_contender_type: args.contender_type,
          p_contender_ref_id: args.contender_ref_id,
          p_slot: args.slot ?? null,
        })) as unknown as { data: unknown; error: { message: string } | null };

        if (error) {
          if (error.message?.includes('slots_full')) return fail('SLOTS_FULL', 'All 26 contender slots are taken', {}, 'battle_add_contender', t0);
          if (error.message?.includes('access_denied')) return fail('FORBIDDEN', 'You do not own this battle', {}, 'battle_add_contender', t0);
          throw new Error(error.message);
        }
        return ok(data, 'battle_add_contender', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_add_contender', t0);
      }
    }
  );
}
