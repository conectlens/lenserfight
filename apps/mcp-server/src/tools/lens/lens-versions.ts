import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'list_lens_versions';

export function registerLensVersions(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'List all versions of a lens ordered newest-first. Each version is immutable — new edits create new versions.',
    { lens_id: zUuid },
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
