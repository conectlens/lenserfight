import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('update_lens');
const TOOL = meta.name;

export function registerLensUpdate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      lens_id: p.lens_id,
      template_body: z.string().min(50).optional(),
      visibility: z.enum(['public', 'community', 'private']).optional(),
      params: z
        .array(z.object({ label: z.string().min(1), optional: z.boolean().optional() }))
        .optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await lensService.update(sb, {
          lens_id: args.lens_id,
          template_body: args.template_body,
          visibility: args.visibility,
          params: args.params?.map((p) => ({ label: p.label, optional: p.optional ?? false })),
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
