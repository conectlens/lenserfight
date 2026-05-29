import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'search_lenses';

export function registerLensSearch(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
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
        const { items, total } = await lensService.search(sb, {
          query: args.query,
          limit,
          offset,
          visibility: args.visibility,
        });
        return paginated(items, total, limit, offset, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
