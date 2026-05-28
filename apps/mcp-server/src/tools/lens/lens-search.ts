import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail } from '../../types.js';

export function registerLensSearch(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_search',
    'Search lenses by keyword. Matches against version template bodies and IDs. Returns paginated results.',
    {
      query: z.string().min(1),
      visibility: z.enum(['public', 'community', 'private']).optional(),
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_search' as never, {
          p_query: args.query,
          p_visibility: args.visibility ?? null,
          p_limit: limit,
          p_offset: offset,
        })) as unknown as {
          data: { data: unknown[]; count: number } | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        return paginated(data?.data ?? [], data?.count ?? 0, limit, offset, 'lens_search', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_search', t0);
      }
    }
  );
}
