import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { McpError } from '../../services/mcp-error.js';
import { threadService } from '../../services/thread.service.js';
import { ok, fail } from '../../types.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { p } from '../tool-params.js';

const meta = getToolMeta('delete_thread_reply');
const TOOL = meta.name;

export function registerThreadDeleteReply(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      reply_id: p.reply_id,
      confirm: z.literal(true, {
        error: () => ({ message: 'You must pass confirm: true to delete a reply.' }),
      }),
    },
    async ({ reply_id }) => {
      const t0 = Date.now();
      try {
        await threadService.deleteReply(sb, reply_id);
        return ok({ reply_id, deleted: true }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
