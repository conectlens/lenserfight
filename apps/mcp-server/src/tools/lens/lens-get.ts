import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensGet(server: McpServer): void {
  server.tool(
    'lens_get',
    'Get a lens with its head version details and full parameter list.',
    {
      lens_id: z.string().uuid('lens_id must be a valid UUID'),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('lenses')
          .select(`
            id, lenser_id, visibility, status, is_featured,
            created_at, updated_at, head_version_id, parent_lens_id, fork_count,
            versions:head_version_id(
              id, semver, template_body, input_contract, output_contract, created_at,
              version_parameters(id, label, optional)
            )
          `)
          .eq('id', lens_id)
          .is('deleted_at', null)
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };
        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_get', t0);
          throw new Error(error.message);
        }
        return ok(data, 'lens_get', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_get', t0);
      }
    }
  );
}
