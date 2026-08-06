import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { McpError } from '../../services/mcp-error.js';
import { threadService } from '../../services/thread.service.js';
import { ok, fail } from '../../types.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';

const meta = getToolMeta('list_my_threads');
const TOOL = meta.name;

export function registerThreadListMine(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const items = await threadService.listMine(sb, { limit, offset });
        return ok({ items, limit, offset, has_more: items.length === limit }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
