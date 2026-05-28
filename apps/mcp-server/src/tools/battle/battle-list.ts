import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { paginated, fail } from '../../types.js';

export function registerBattleList(server: McpServer): void {
  server.tool(
    'battle_list',
    'List battles with pagination. Filter by status, battle_type, or creator lenser.',
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      status: z.enum(['draft','open','executing','voting','scoring','closed','published','archived']).optional(),
      battle_type: z.enum(['ai_vs_ai','human_vs_human_ai_votes','human_vs_human_open_votes','human_vs_ai','workflow_battle','lenser_battle']).optional(),
      creator_lenser_id: z.string().uuid().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const sb = getServiceClient();
        let q = (sb as never as { schema: (s: string) => typeof sb })
          .schema('battles')
          .from('battles')
          .select('id, title, slug, status, battle_type, judging_mode, created_at, updated_at, creator_lenser_id, total_vote_count', { count: 'exact' })
          .is('deleted_at', null)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (args.status) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('status', args.status);
        if (args.battle_type) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('battle_type', args.battle_type);
        if (args.creator_lenser_id) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('creator_lenser_id', args.creator_lenser_id);

        const { data, error, count } = await q as unknown as { data: unknown[]; error: { message: string } | null; count: number | null };
        if (error) throw new Error(error.message);
        return paginated(data ?? [], count ?? 0, limit, offset, 'battle_list', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_list', t0);
      }
    }
  );
}
