import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { paginated, fail } from '../../types.js';

export function registerLensSearch(server: McpServer): void {
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
        const sb = getServiceClient();
        const { data, error, count } = await sb.rpc('fn_search_lenses' as never, {
          p_query: args.query,
          p_visibility: args.visibility ?? null,
          p_limit: limit,
          p_offset: offset,
        }) as unknown as { data: unknown[]; error: { message: string } | null; count: number | null };

        if (error) {
          const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');
          let q = schema
            .from('lenses')
            .select('id, lenser_id, visibility, status, created_at, head_version_id', { count: 'exact' })
            .ilike('id', `%${args.query}%`)
            .range(offset, offset + limit - 1);
          if (args.visibility) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('visibility', args.visibility);
          const fallback = await q as unknown as { data: unknown[]; error: unknown; count: number | null };
          return paginated(fallback.data ?? [], fallback.count ?? 0, limit, offset, 'lens_search', t0);
        }

        return paginated(data ?? [], count ?? 0, limit, offset, 'lens_search', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_search', t0);
      }
    }
  );
}
