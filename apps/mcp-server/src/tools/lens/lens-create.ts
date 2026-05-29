import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('create_lens');
const TOOL = meta.name;

export function registerLensCreate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      title: z.string().min(1).max(200),
      template_body: z.string().min(50, 'Template must be at least 50 characters'),
      visibility: z.enum(['public', 'community', 'private']).default('public').optional(),
      params: z
        .array(
          z.object({
            label: z.string().min(1),
            optional: z.boolean().default(false).optional(),
          })
        )
        .default([])
        .optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await lensService.create(sb, {
          title: args.title,
          template_body: args.template_body,
          visibility: args.visibility ?? 'public',
          params: (args.params ?? []).map((p) => ({ label: p.label, optional: p.optional ?? false })),
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
