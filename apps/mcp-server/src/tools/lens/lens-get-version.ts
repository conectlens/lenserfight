import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensGetVersion(server: McpServer): void {
  server.tool(
    'lens_get_version',
    'Get a specific lens version by its ID or semver string. Returns the full template body and parameter list.',
    {
      lens_id: z.string().uuid(),
      version_id: z.string().uuid().optional(),
      semver: z.string().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      if (!args.version_id && !args.semver) {
        return fail('BAD_INPUT', 'Provide version_id or semver', {}, 'lens_get_version', t0);
      }
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');
        let q = schema
          .from('versions')
          .select('id, lens_id, semver, template_body, input_contract, output_contract, content_hash, created_at, version_parameters(id, label, optional)')
          .eq('lens_id', args.lens_id);

        if (args.version_id) {
          q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('id', args.version_id);
        } else {
          q = (q as never as { eq: (...a: unknown[]) => typeof q }).eq('semver', args.semver!);
        }

        const { data, error } = await (q as never as { single: () => Promise<{ data: unknown; error: { message: string; code: string } | null }> }).single();
        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', 'Version not found', {}, 'lens_get_version', t0);
          throw new Error(error.message);
        }
        return ok(data, 'lens_get_version', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_get_version', t0);
      }
    }
  );
}
