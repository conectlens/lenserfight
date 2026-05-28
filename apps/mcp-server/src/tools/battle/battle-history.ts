import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail } from '../../types.js';
import { getConfig } from '../../config.js';

export function registerBattleHistory(server: McpServer, sb: SupabaseClient): void {
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
        const { data, error } = (await sb.rpc('fn_mcp_battle_history' as never, {
          p_lenser_id: lenserId ?? null,
          p_limit: limit,
          p_offset: offset,
          p_status: args.status ?? null,
        })) as unknown as {
          data: { data: unknown[]; count: number } | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        return paginated(data?.data ?? [], data?.count ?? 0, limit, offset, 'battle_history', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_history', t0);
      }
    }
  );
}
