import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail } from '../../types.js';

export function registerLensSearch(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'search_lenses',
    'Full-text search lenses by keyword across title, description, and rendered content. Returns lenses with title, description, language, author, tags, and head_version_id. Use this when the user describes what they want (e.g. "logo brief", "code review") rather than knowing a specific lens id.',
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
        return paginated(data?.data ?? [], data?.count ?? 0, limit, offset, 'search_lenses', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'search_lenses', t0);
      }
    }
  );
}
