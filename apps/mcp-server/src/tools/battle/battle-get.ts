import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerBattleGet(server: McpServer): void {
  server.tool(
    'battle_get',
    'Get a battle with its contenders, vote aggregates, and submissions.',
    {
      battle_id: z.string().uuid(),
    },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('battles');

        const { data: battle, error } = await schema
          .from('battles')
          .select(`
            id, title, slug, status, battle_type, judging_mode, task_prompt,
            max_contenders, total_vote_count, ai_judge_enabled, ai_judge_model_key,
            created_at, updated_at, voting_opens_at, voting_closes_at,
            creator_lenser_id, winner_contender_id, lens_id, workflow_id,
            contenders(id, slot, contender_type, display_name, contender_status, joined_at),
            vote_aggregates(contender_id, raw_vote_count, weighted_vote_sum, rank_position),
            submissions(id, contender_id, status, content_text, created_at)
          `)
          .eq('id', battle_id)
          .is('deleted_at', null)
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };

        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Battle ${battle_id} not found`, {}, 'battle_get', t0);
          throw new Error(error.message);
        }
        return ok(battle, 'battle_get', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_get', t0);
      }
    }
  );
}
