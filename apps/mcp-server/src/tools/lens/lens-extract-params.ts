import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

interface ResolveTemplateResult {
  lens_id: string;
  version_id: string;
  template_body: string;
  parameters: Array<{ id: string; label: string; optional: boolean }>;
}

export function registerLensExtractParams(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'extract_lens_params',
    'Extract [[Parameter]] token info from a lens version. Returns each parameter label, whether it is optional, and its internal UUID.',
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
    },
    async ({ lens_id, version_id }) => {
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
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'extract_lens_params', t0);

        const tokens: string[] = [];
        if (data.template_body) {
          const rx = /\[\[([^\]:]+?)!?\]\]/g;
          let m: RegExpExecArray | null;
          while ((m = rx.exec(data.template_body)) !== null) {
            if (!tokens.includes(m[1])) tokens.push(m[1]);
          }
        }

        return ok({
          lens_id,
          version_id: data.version_id,
          params: data.parameters ?? [],
          raw_tokens_in_template: tokens,
        }, 'extract_lens_params', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'extract_lens_params', t0);
      }
    }
  );
}
