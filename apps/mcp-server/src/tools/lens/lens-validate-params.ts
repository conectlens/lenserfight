import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerLensValidateParams(server: McpServer): void {
  server.tool(
    'lens_validate_params',
    'Validate parameter values against a lens version schema. Returns which params are missing, which are unknown, and whether the input is valid.',
    {
      lens_id: z.string().uuid(),
      version_id: z.string().uuid().optional(),
      values: z.record(z.string()),
    },
    async ({ lens_id, version_id, values }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');

        let resolvedVersionId = version_id;
        if (!resolvedVersionId) {
          const { data: lens } = await schema
            .from('lenses')
            .select('head_version_id')
            .eq('id', lens_id)
            .is('deleted_at', null)
            .single() as unknown as { data: { head_version_id: string } | null; error: unknown };
          if (!lens) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_validate_params', t0);
          resolvedVersionId = lens.head_version_id;
        }

        const { data: params } = await schema
          .from('version_parameters')
          .select('id, label, optional')
          .eq('version_id', resolvedVersionId) as unknown as {
          data: Array<{ id: string; label: string; optional: boolean }> | null;
        };

        const allParams = params ?? [];
        const providedLabels = Object.keys(values).map((k) => k.toLowerCase());

        const missing = allParams
          .filter((p) => !p.optional && !providedLabels.includes(p.label.toLowerCase()))
          .map((p) => p.label);

        const knownLabels = allParams.map((p) => p.label.toLowerCase());
        const unknown = Object.keys(values).filter((k) => !knownLabels.includes(k.toLowerCase()));

        return ok({
          valid: missing.length === 0 && unknown.length === 0,
          missing,
          unknown,
          total_params: allParams.length,
          provided: Object.keys(values).length,
        }, 'lens_validate_params', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_validate_params', t0);
      }
    }
  );
}
