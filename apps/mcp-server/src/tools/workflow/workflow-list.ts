import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { paginated, fail } from '../../types.js';

export function registerWorkflowList(server: McpServer): void {
  server.tool(
    'workflow_list',
    'List workflows with pagination. Optionally filter by visibility or lenser.',
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      visibility: z.enum(['public', 'private', 'unlisted']).optional(),
      lenser_id: z.string().uuid().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const sb = getServiceClient();
        let q = (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('workflows')
          .select('id, lenser_id, title, description, visibility, battle_count, fork_count, created_at, updated_at', { count: 'exact' })
          .is('deleted_at', null)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (args.visibility) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('visibility', args.visibility);
        if (args.lenser_id) q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('lenser_id', args.lenser_id);

        const { data, error, count } = await q as unknown as { data: unknown[]; error: { message: string } | null; count: number | null };
        if (error) throw new Error(error.message);
        return paginated(data ?? [], count ?? 0, limit, offset, 'workflow_list', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_list', t0);
      }
    }
  );
}
