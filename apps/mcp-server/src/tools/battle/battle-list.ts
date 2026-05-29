import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail, zUuid } from '../../types.js';

export function registerBattleList(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'list_battles',
    'List battles with pagination. Filter by status, battle_type, or creator lenser.',
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      status: z.enum(['draft','open','executing','voting','scoring','closed','published','archived']).optional(),
      battle_type: z.enum(['ai_vs_ai','human_vs_human_ai_votes','human_vs_human_open_votes','human_vs_ai','workflow_battle','lenser_battle']).optional(),
      creator_lenser_id: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_list' as never, {
          p_limit: limit,
          p_offset: offset,
          p_status: args.status ?? null,
          p_battle_type: args.battle_type ?? null,
          p_creator_lenser_id: args.creator_lenser_id ?? null,
        })) as unknown as {
          data: { data: unknown[]; count: number } | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        return paginated(data?.data ?? [], data?.count ?? 0, limit, offset, 'list_battles', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'list_battles', t0);
      }
    }
  );
}
