import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'delete_lens';

export function registerLensDelete(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Soft-delete a lens by setting deleted_at. DESTRUCTIVE — requires confirm: true. The lens will no longer appear in any listings.',
    {
      lens_id: zUuid,
      confirm: z.literal(true, {
        error: () => ({ message: 'You must pass confirm: true to delete a lens.' }),
      }),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const data = await lensService.delete(sb, lens_id);
        return ok({ deleted: true, ...((data as Record<string, unknown>) ?? {}) }, TOOL, t0);
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
