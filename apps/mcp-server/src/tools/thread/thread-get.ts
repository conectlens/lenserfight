import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';

import { McpError } from '../../services/mcp-error.js';
import { threadService } from '../../services/thread.service.js';
import { ok, fail } from '../../types.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { p } from '../tool-params.js';

const meta = getToolMeta('get_thread');
const TOOL = meta.name;

export function registerThreadGet(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    { thread_id: p.thread_id },
    async ({ thread_id }) => {
      const t0 = Date.now();
      try {
        const data = await threadService.get(sb, thread_id);
        if (!data) return fail('NOT_FOUND', `Thread ${thread_id} not found`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
