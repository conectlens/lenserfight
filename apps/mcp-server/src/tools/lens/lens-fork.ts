import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensFork(server: McpServer): void {
  server.tool(
    'lens_fork',
    'Fork a lens. Creates a new lens with the source as its parent. Optionally override the title or template body.',
    {
      source_lens_id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      template_body: z.string().min(50).optional(),
      visibility: z.enum(['public', 'community', 'private']).default('public').optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();

        let finalTemplateBody = args.template_body;
        if (!finalTemplateBody) {
          const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');
          const { data: lens } = await schema
            .from('lenses')
            .select('head_version_id')
            .eq('id', args.source_lens_id)
            .is('deleted_at', null)
            .single() as unknown as { data: { head_version_id: string } | null };
          if (lens) {
            const { data: ver } = await schema
              .from('versions')
              .select('template_body')
              .eq('id', lens.head_version_id)
              .single() as unknown as { data: { template_body: string } | null };
            finalTemplateBody = ver?.template_body;
          }
        }
        if (!finalTemplateBody) return fail('NOT_FOUND', `Source lens ${args.source_lens_id} or its template not found`, {}, 'lens_fork', t0);

        const { data, error } = await sb.rpc('fn_create_lens' as never, {
          p_title: args.title ?? `Fork of ${args.source_lens_id}`,
          p_template_body: finalTemplateBody,
          p_visibility: args.visibility ?? 'public',
          p_parent_lens_id: args.source_lens_id,
          p_params: JSON.stringify([]),
        }) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'lens_fork', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_fork', t0);
      }
    }
  );
}
