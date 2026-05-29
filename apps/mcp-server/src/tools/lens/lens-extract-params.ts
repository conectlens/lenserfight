import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'extract_lens_params';

export function registerLensExtractParams(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Extract [[Parameter]] token info from a lens version. Returns each parameter label, whether it is optional, and its internal UUID.',
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
    },
    async ({ lens_id, version_id }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.resolveTemplate(sb, { lens_id, version_id });
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, TOOL, t0);

        const tokens: string[] = [];
        if (data.template_body) {
          const rx = /\[\[([^\]:]+?)!?\]\]/g;
          let m: RegExpExecArray | null;
          while ((m = rx.exec(data.template_body)) !== null) {
            if (!tokens.includes(m[1])) tokens.push(m[1]);
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
