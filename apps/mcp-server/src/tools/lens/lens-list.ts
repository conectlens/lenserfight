import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'list_lenses';

export function registerLensList(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Browse LenserFight lenses (reusable AI prompt templates). Returns a paginated list with title, description, language, author handle, tags, and head_version_id for each lens. Use this to discover lenses available to the authenticated user. Each result includes everything you need to identify a lens by topic; call get_lens for the full template body and parameters.',
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      visibility: z.enum(['public', 'community', 'private']).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      lenser_id: zUuid.optional(),
      include_archived: z.boolean().default(false).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const { items, total } = await lensService.list(sb, {
          limit,
          offset,
          visibility: args.visibility,
          status: args.status,
          lenser_id: args.lenser_id,
          include_archived: args.include_archived,
        });
        return paginated(items, total, limit, offset, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
