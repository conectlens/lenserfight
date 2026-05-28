import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerLensArchive(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_archive',
    'Archive a lens. Sets status to archived and records the archived_at timestamp. The lens is hidden from listings but not deleted.',
    {
      lens_id: z.string().uuid(),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_archive' as never, {
          p_lens_id: lens_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('lens_not_found')) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_archive', t0);
          if (error.message?.includes('access_denied')) return fail('FORBIDDEN', 'You do not own this lens', {}, 'lens_archive', t0);
          throw new Error(error.message);
        }
        return ok(data, 'lens_archive', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_archive', t0);
      }
    }
  );
}
