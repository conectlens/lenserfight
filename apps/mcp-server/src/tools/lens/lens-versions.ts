import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensVersions(server: McpServer): void {
  server.tool(
    'lens_versions',
    'List all versions of a lens ordered newest-first. Each version is immutable — new edits create new versions.',
    {
      lens_id: z.string().uuid(),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('versions')
          .select('id, lens_id, semver, content_hash, created_at, version_parameters(id, label, optional)')
          .eq('lens_id', lens_id)
          .order('created_at', { ascending: false }) as unknown as {
          data: unknown[];
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        return ok({ lens_id, versions: data ?? [], count: data?.length ?? 0 }, 'lens_versions', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_versions', t0);
      }
    }
  );
}
