import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensExtractParams(server: McpServer): void {
  server.tool(
    'lens_extract_params',
    'Extract [[Parameter]] token info from a lens version. Returns each parameter label, whether it is optional, and its internal UUID.',
    {
      lens_id: z.string().uuid(),
      version_id: z.string().uuid().optional(),
    },
    async ({ lens_id, version_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');

        let resolvedVersionId = version_id;
        if (!resolvedVersionId) {
          const { data: lens, error: lensErr } = await schema
            .from('lenses')
            .select('head_version_id')
            .eq('id', lens_id)
            .is('deleted_at', null)
            .single() as unknown as { data: { head_version_id: string } | null; error: unknown };
          if (lensErr || !lens) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_extract_params', t0);
          resolvedVersionId = lens.head_version_id;
        }

        const { data: params, error: paramErr } = await schema
          .from('version_parameters')
          .select('id, label, optional')
          .eq('version_id', resolvedVersionId)
          .order('label') as unknown as {
          data: Array<{ id: string; label: string; optional: boolean }> | null;
          error: unknown;
        };

        if (paramErr) throw new Error(String(paramErr));

        const { data: version } = await schema
          .from('versions')
          .select('template_body')
          .eq('id', resolvedVersionId)
          .single() as unknown as { data: { template_body: string } | null; error: unknown };

        const tokens: string[] = [];
        if (version?.template_body) {
          const rx = /\[\[([^\]:]+?)!?\]\]/g;
          let m: RegExpExecArray | null;
          while ((m = rx.exec(version.template_body)) !== null) {
            if (!tokens.includes(m[1])) tokens.push(m[1]);
          }
        }

        return ok({
          lens_id,
          version_id: resolvedVersionId,
          params: params ?? [],
          raw_tokens_in_template: tokens,
        }, 'lens_extract_params', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_extract_params', t0);
      }
    }
  );
}
