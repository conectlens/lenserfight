import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'validate_lens_params';

export function registerLensValidateParams(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Validate parameter values against a lens version schema. Returns which params are missing, which are unknown, and whether the input is valid.',
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
      values: z.record(z.string(), z.string()),
    },
    async ({ lens_id, version_id, values }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.resolveTemplate(sb, { lens_id, version_id });
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, TOOL, t0);

        const allParams = data.parameters ?? [];
        const providedLabels = Object.keys(values).map((k) => k.toLowerCase());

        const missing = allParams
          .filter((p) => !p.optional && !providedLabels.includes(p.label.toLowerCase()))
          .map((p) => p.label);

        const knownLabels = allParams.map((p) => p.label.toLowerCase());
        const unknown = Object.keys(values).filter((k) => !knownLabels.includes(k.toLowerCase()));

        return ok(
          {
            valid: missing.length === 0 && unknown.length === 0,
            missing,
            unknown,
            total_params: allParams.length,
            provided: Object.keys(values).length,
          },
          TOOL,
          t0
        );
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
