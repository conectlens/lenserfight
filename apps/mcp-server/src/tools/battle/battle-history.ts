import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { paginated, fail } from '../../types.js';
import { getConfig } from '../../config.js';

export function registerBattleHistory(server: McpServer): void {
  server.tool(
    'battle_history',
    'Get structured battle history for a lenser — battles they created or participated in, with outcomes.',
    {
      lenser_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      status: z.enum(['closed','published','archived']).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      const lenserId = args.lenser_id ?? getConfig().lenserId;
      try {
        const sb = getServiceClient();
        let q = (sb as never as { schema: (s: string) => typeof sb })
          .schema('battles')
          .from('battles')
          .select(
            'id, title, slug, status, battle_type, judging_mode, total_vote_count, winner_contender_id, created_at, finalized_at',
            { count: 'exact' }
          )
          .is('deleted_at', null)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (lenserId) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('creator_lenser_id', lenserId);
        if (args.status) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('status', args.status);

        const { data, error, count } = await q as unknown as { data: unknown[]; error: { message: string } | null; count: number | null };
        if (error) throw new Error(error.message);
        return paginated(data ?? [], count ?? 0, limit, offset, 'battle_history', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_history', t0);
      }
    }
  );
}
