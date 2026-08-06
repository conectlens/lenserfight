import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('extract_lens_params');
const TOOL = meta.name;

export function registerLensExtractParams(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      lens_id: p.lens_id,
      version_id: p.lens_version_id.optional(),
    },
    async ({ lens_id, version_id }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.resolveTemplate(sb, { lens_id, version_id });
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, TOOL, t0);

        const tokens: string[] = [];
        if (data.template_body) {
          const idToLabel = new Map((data.parameters ?? []).map((param) => [param.id, param.label]));
          // Templates store either a human-readable [[Label]] token or, once a
          // rename has resolved it, a [[:paramId]] reference; resolve the latter
          // back to its label so both forms surface the same parameter list.
          const rx = /\[\[(:?[^\]!]+?)!?\]\]/g;
          let m: RegExpExecArray | null;
          while ((m = rx.exec(data.template_body)) !== null) {
            const raw = m[1];
            const label = raw.startsWith(':') ? (idToLabel.get(raw.slice(1)) ?? raw) : raw;
            if (!tokens.includes(label)) tokens.push(label);
          }
        }

        return ok(
          {
            lens_id,
            version_id: data.version_id,
            params: data.parameters ?? [],
            raw_tokens_in_template: tokens,
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
