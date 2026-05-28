import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensDelete(server: McpServer): void {
  server.tool(
    'lens_delete',
    'Soft-delete a lens by setting deleted_at. DESTRUCTIVE — requires confirm: true. The lens will no longer appear in any listings.',
    {
      lens_id: z.string().uuid(),
      confirm: z.literal(true, {
        errorMap: () => ({ message: 'You must pass confirm: true to delete a lens.' }),
      }),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('lenses')
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', lens_id)
          .is('deleted_at', null)
          .select('id, deleted_at')
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };
        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_delete', t0);
          throw new Error(error.message);
        }
        return ok({ deleted: true, ...((data as Record<string, unknown>) ?? {}) }, 'lens_delete', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_delete', t0);
      }
    }
  );
}
