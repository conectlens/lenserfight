import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { paginated, fail } from '../../types.js';

export function registerLensList(server: McpServer): void {
  server.tool(
    'lens_list',
    'List lenses with pagination. Filter by visibility, status, or lenser_id.',
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      visibility: z.enum(['public', 'community', 'private']).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      lenser_id: z.string().uuid().optional(),
      include_archived: z.boolean().default(false).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const sb = getServiceClient();
        let q = (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('lenses')
          .select(
            'id, lenser_id, visibility, status, is_featured, created_at, updated_at, head_version_id',
            { count: 'exact' }
          )
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (!args.include_archived) q = (q as never as { not: (...a: unknown[]) => typeof q }).not('status', 'eq', 'archived');
        if (args.visibility) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('visibility', args.visibility);
        if (args.status) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('status', args.status);
        if (args.lenser_id) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('lenser_id', args.lenser_id);

        const { data, error, count } = await q as unknown as { data: unknown[]; error: { message: string } | null; count: number | null };
        if (error) throw new Error(error.message);
        return paginated(data ?? [], count ?? 0, limit, offset, 'lens_list', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_list', t0);
      }
    }
  );
}
