import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

interface ResolveTemplateResult {
  lens_id: string;
  version_id: string;
  template_body: string;
  parameters: Array<{ id: string; label: string; optional: boolean }>;
}

export function registerLensValidateParams(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_validate_params',
    'Validate parameter values against a lens version schema. Returns which params are missing, which are unknown, and whether the input is valid.',
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
      values: z.record(z.string(), z.string()),
    },
    async ({ lens_id, version_id, values }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_resolve_template' as never, {
          p_lens_id: lens_id,
          p_version_id: version_id ?? null,
        })) as unknown as {
          data: ResolveTemplateResult | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_validate_params', t0);

        const allParams = data.parameters ?? [];
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
