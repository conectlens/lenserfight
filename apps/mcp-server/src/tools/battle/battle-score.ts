import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerBattleScore(server: McpServer): void {
  server.tool(
    'battle_score',
    'Read scoring data for a battle: vote aggregates per contender and any AI judge verdicts.',
    {
      battle_id: z.string().uuid(),
    },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('battles');

        const [{ data: votes }, { data: verdicts }] = await Promise.all([
          schema
            .from('vote_aggregates')
            .select('contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position')
            .eq('battle_id', battle_id) as unknown as Promise<{ data: unknown[] | null }>,
          schema
            .from('ai_judge_verdicts')
            .select('contender_id, verdict, score, reasoning, model_key, judged_at')
            .eq('battle_id', battle_id) as unknown as Promise<{ data: unknown[] | null }>,
        ]);

        return ok({
          battle_id,
          vote_aggregates: votes ?? [],
          ai_judge_verdicts: verdicts ?? [],
        }, 'battle_score', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_score', t0);
      }
    }
  );
}
