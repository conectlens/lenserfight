import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerLensCreate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'create_lens',
    'Create a new lens with a template body and optional parameters. Template must be at least 50 characters. Use [[ParamName]] for required params, [[ParamName!]] for optional ones.',
    {
      title: z.string().min(1).max(200),
      template_body: z.string().min(50, 'Template must be at least 50 characters'),
      visibility: z.enum(['public', 'community', 'private']).default('public').optional(),
      params: z
        .array(
          z.object({
            label: z.string().min(1),
            optional: z.boolean().default(false).optional(),
          })
        )
        .default([])
        .optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = await sb.rpc('fn_create_lens' as never, {
          p_title: args.title,
          p_template_body: args.template_body,
          p_visibility: args.visibility ?? 'public',
          p_params: JSON.stringify(
            (args.params ?? []).map((p) => ({ label: p.label, optional: p.optional ?? false }))
          ),
        }) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'create_lens', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'create_lens', t0);
      }
    }
  );
}
