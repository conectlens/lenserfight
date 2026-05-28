import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail } from '../../types.js';

export function registerWorkflowList(server: McpServer, sb: SupabaseClient): void {
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
        const { data, error } = (await sb.rpc('fn_mcp_workflow_list' as never, {
          p_limit: limit,
          p_offset: offset,
          p_visibility: args.visibility ?? null,
          p_lenser_id: args.lenser_id ?? null,
        })) as unknown as {
          data: { data: unknown[]; count: number } | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        return paginated(data?.data ?? [], data?.count ?? 0, limit, offset, 'workflow_list', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_list', t0);
      }
    }
  );
}
