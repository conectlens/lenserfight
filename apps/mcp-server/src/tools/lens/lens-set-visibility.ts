import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensSetVisibility(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_set_visibility',
    'Change the visibility of a lens. public = anyone, community = logged-in users, private = owner only.',
    {
      lens_id: zUuid,
      visibility: z.enum(['public', 'community', 'private']),
    },
    async ({ lens_id, visibility }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_set_visibility' as never, {
          p_lens_id: lens_id,
          p_visibility: visibility,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('lens_not_found')) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_set_visibility', t0);
          if (error.message?.includes('access_denied')) return fail('FORBIDDEN', 'You do not own this lens', {}, 'lens_set_visibility', t0);
          throw new Error(error.message);
        }
        return ok(data, 'lens_set_visibility', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_set_visibility', t0);
      }
    }
  );
}
