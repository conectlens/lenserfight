import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensArchive(server: McpServer): void {
  server.tool(
    'lens_archive',
    'Archive a lens. Sets status to archived and records the archived_at timestamp. The lens is hidden from listings but not deleted.',
    {
      lens_id: z.string().uuid(),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('lenses')
          .update({ status: 'archived', archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', lens_id)
          .is('deleted_at', null)
          .select('id, status, archived_at')
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };
        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_archive', t0);
          throw new Error(error.message);
        }
        return ok(data, 'lens_archive', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_archive', t0);
      }
    }
  );
}
