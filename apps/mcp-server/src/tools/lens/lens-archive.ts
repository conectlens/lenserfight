import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'archive_lens';

export function registerLensArchive(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Archive a lens. Sets status to archived and records the archived_at timestamp. The lens is hidden from listings but not deleted.',
    { lens_id: zUuid },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.archive(sb, lens_id);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `Lens ${lens_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
