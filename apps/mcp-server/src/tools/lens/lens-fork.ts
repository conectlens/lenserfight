import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

interface ResolveTemplateResult {
  lens_id: string;
  version_id: string;
  template_body: string;
}

export function registerLensFork(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'fork_lens',
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
          const { data: resolveData, error: resolveErr } = (await sb.rpc(
            'fn_mcp_lens_resolve_template' as never,
            { p_lens_id: args.source_lens_id, p_version_id: null }
          )) as unknown as {
            data: ResolveTemplateResult | null;
            error: { message: string } | null;
          };
          if (resolveErr) throw new Error(resolveErr.message);
          finalTemplateBody = resolveData?.template_body;
        }
        if (!finalTemplateBody) return fail('NOT_FOUND', `Source lens ${args.source_lens_id} or its template not found`, {}, 'fork_lens', t0);

        const { data, error } = (await sb.rpc('fn_create_lens' as never, {
          p_title: args.title ?? `Fork of ${args.source_lens_id}`,
          p_template_body: finalTemplateBody,
          p_visibility: args.visibility ?? 'public',
          p_parent_lens_id: args.source_lens_id,
          p_params: JSON.stringify([]),
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'fork_lens', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'fork_lens', t0);
      }
    }
  );
}
