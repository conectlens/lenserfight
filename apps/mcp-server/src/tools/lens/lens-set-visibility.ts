import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'set_lens_visibility';

export function registerLensSetVisibility(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Change the visibility of a lens. public = anyone, community = logged-in users, private = owner only.',
    {
      lens_id: zUuid,
      visibility: z.enum(['public', 'community', 'private']),
    },
    async ({ lens_id, visibility }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.setVisibility(sb, { lens_id, visibility });
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
