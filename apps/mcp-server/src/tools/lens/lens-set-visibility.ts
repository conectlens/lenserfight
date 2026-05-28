import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensSetVisibility(server: McpServer): void {
  server.tool(
    'lens_set_visibility',
    'Change the visibility of a lens. public = anyone, community = logged-in users, private = owner only.',
    {
      lens_id: z.string().uuid(),
      visibility: z.enum(['public', 'community', 'private']),
    },
    async ({ lens_id, visibility }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('lenses')
          .update({ visibility, updated_at: new Date().toISOString() })
          .eq('id', lens_id)
          .is('deleted_at', null)
          .select('id, visibility')
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };
        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_set_visibility', t0);
          throw new Error(error.message);
        }
        return ok(data, 'lens_set_visibility', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_set_visibility', t0);
      }
    }
  );
}
