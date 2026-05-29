import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'fork_lens';

export function registerLensFork(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Fork a lens. Creates a new lens with the source as its parent. Optionally override the title or template body.',
    {
      source_lens_id: zUuid,
      title: z.string().min(1).max(200).optional(),
      template_body: z.string().min(50).optional(),
      visibility: z.enum(['public', 'community', 'private']).default('public').optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        let finalTemplateBody = args.template_body;
        if (!finalTemplateBody) {
          const resolveData = await lensService.resolveTemplate(sb, { lens_id: args.source_lens_id });
          finalTemplateBody = resolveData?.template_body;
        }
        if (!finalTemplateBody) {
          return fail(
            'NOT_FOUND',
            `Source lens ${args.source_lens_id} or its template not found`,
            {},
            TOOL,
            t0
          );
        }

        const data = await lensService.create(sb, {
          title: args.title ?? `Fork of ${args.source_lens_id}`,
          template_body: finalTemplateBody,
          visibility: args.visibility ?? 'public',
          params: [],
          parent_lens_id: args.source_lens_id,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
