import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensArchive(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'archive_lens',
    'Archive a lens. Sets status to archived and records the archived_at timestamp. The lens is hidden from listings but not deleted.',
    {
      lens_id: zUuid,
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_archive' as never, {
          p_lens_id: lens_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('lens_not_found')) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'archive_lens', t0);
          if (error.message?.includes('access_denied')) return fail('FORBIDDEN', 'You do not own this lens', {}, 'archive_lens', t0);
          throw new Error(error.message);
        }
        return ok(data, 'archive_lens', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'archive_lens', t0);
      }
    }
  );
}
