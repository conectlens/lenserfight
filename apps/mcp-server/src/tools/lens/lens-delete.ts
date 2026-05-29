import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('delete_lens');
const TOOL = meta.name;

export function registerLensDelete(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      lens_id: p.lens_id,
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
