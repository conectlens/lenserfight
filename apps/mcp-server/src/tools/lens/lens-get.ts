import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_lens';

export function registerLensGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Fetch a single lens with full metadata: title, description, content (rendered preview), author, tags, language, and its head version including the template body, input/output contracts, and parameter list. Call this after list_lenses / search_lenses when you need the actual template + parameters to execute a lens via run_lens.',
    { lens_id: zUuid },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.get(sb, lens_id);
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
