import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerBattleAddContender(server: McpServer): void {
  server.tool(
    'battle_add_contender',
    'Add a competitor to a battle. contender_ref_id is a profile UUID (human) or ai_lenser UUID (AI). Slot is auto-assigned A, B, C... if omitted.',
    {
      battle_id: z.string().uuid(),
      display_name: z.string().min(1).max(100),
      contender_type: z.enum(['human', 'ai_model', 'ai_agent']),
      contender_ref_id: z.string().uuid(),
      slot: z.string().length(1).regex(/^[A-Z]$/).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('battles');

        let slot = args.slot;
        if (!slot) {
          const { data: existing } = await schema
            .from('contenders')
            .select('slot')
            .eq('battle_id', args.battle_id) as unknown as { data: Array<{ slot: string }> | null };
          const usedSlots = new Set((existing ?? []).map((c) => c.slot));
          for (let i = 0; i < 26; i++) {
            const candidate = String.fromCharCode(65 + i);
            if (!usedSlots.has(candidate)) { slot = candidate; break; }
          }
          if (!slot) return fail('SLOTS_FULL', 'All 26 contender slots are taken', {}, 'battle_add_contender', t0);
        }

        const { data: contender, error } = await schema
          .from('contenders')
          .insert({
            battle_id: args.battle_id,
            slot,
            contender_type: args.contender_type,
            contender_ref_id: args.contender_ref_id,
            display_name: args.display_name,
            contender_status: 'active',
            entry_mode: 'direct',
          })
          .select('id, slot, display_name')
          .single() as unknown as { data: { id: string; slot: string } | null; error: { message: string } | null };

        if (error) throw new Error(error.message);
        if (!contender) throw new Error('No contender returned');

        const entityField = args.contender_type === 'human' ? 'profile_id' : 'ai_lenser_id';
        await schema.from('contender_entity_map').insert({
          contender_id: contender.id,
          [entityField]: args.contender_ref_id,
        });

        return ok({ contender_id: contender.id, slot: contender.slot, display_name: args.display_name }, 'battle_add_contender', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_add_contender', t0);
      }
    }
  );
}
