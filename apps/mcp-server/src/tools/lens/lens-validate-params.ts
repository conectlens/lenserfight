import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('validate_lens_params');
const TOOL = meta.name;

export function registerLensValidateParams(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      lens_id: p.lens_id,
      version_id: p.lens_version_id.optional(),
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
