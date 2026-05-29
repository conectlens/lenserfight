import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensDelete(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'delete_lens',
    'Soft-delete a lens by setting deleted_at. DESTRUCTIVE — requires confirm: true. The lens will no longer appear in any listings.',
    {
      lens_id: zUuid,
      confirm: z.literal(true, {
        error: () => ({ message: 'You must pass confirm: true to delete a lens.' }),
      }),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_delete' as never, {
          p_lens_id: lens_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('lens_not_found')) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'delete_lens', t0);
          if (error.message?.includes('access_denied')) return fail('FORBIDDEN', 'You do not own this lens', {}, 'delete_lens', t0);
          throw new Error(error.message);
        }
        return ok({ deleted: true, ...((data as Record<string, unknown>) ?? {}) }, 'delete_lens', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'delete_lens', t0);
      }
    }
  );
}
