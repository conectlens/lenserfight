import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('list_lens_versions');
const TOOL = meta.name;

export function registerLensVersions(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    { lens_id: p.lens_id },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.listVersions(sb, lens_id);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
