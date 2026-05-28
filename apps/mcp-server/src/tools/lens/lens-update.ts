import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensUpdate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_update',
    'Update a lens. Creates a new immutable version — the original is never modified. Pass template_body to change the prompt, params to change parameters.',
    {
      lens_id: zUuid,
      template_body: z.string().min(50).optional(),
      visibility: z.enum(['public', 'community', 'private']).optional(),
      params: z
        .array(z.object({ label: z.string().min(1), optional: z.boolean().optional() }))
        .optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = await sb.rpc('fn_update_lens' as never, {
          p_lens_id: args.lens_id,
          p_template_body: args.template_body ?? null,
          p_visibility: args.visibility ?? null,
          p_params: args.params ? JSON.stringify(args.params) : null,
        }) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'lens_update', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_update', t0);
      }
    }
  );
}
