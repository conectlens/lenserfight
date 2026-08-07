import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { McpError } from '../../services/mcp-error.js';
import { threadService } from '../../services/thread.service.js';
import { ok, fail } from '../../types.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { p } from '../tool-params.js';

const meta = getToolMeta('add_thread_reply');
const TOOL = meta.name;

export function registerThreadAddReply(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      thread_id: p.thread_id,
      content: z.string().min(1).describe('Reply body content.'),
      parent_reply_id: p.reply_id
        .optional()
        .describe('Parent reply UUID to nest this as a reply-to-a-reply; omit for a top-level reply.'),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await threadService.addReply(sb, {
          thread_id: args.thread_id,
          content: args.content,
          parent_reply_id: args.parent_reply_id ?? null,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
