import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { McpError } from '../../services/mcp-error.js';
import { threadService } from '../../services/thread.service.js';
import { ok, fail, zUuid } from '../../types.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';

const meta = getToolMeta('create_thread');
const TOOL = meta.name;

export function registerThreadCreate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      title: z.string().min(1).max(200).describe('Thread title.'),
      content: z.string().min(1).describe('Thread body content.'),
      visibility: z
        .enum(['public', 'community', 'private'])
        .default('public')
        .optional()
        .describe('Who can discover the thread.'),
      tag_ids: z.array(zUuid).default([]).optional().describe('Existing tag UUIDs to attach.'),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await threadService.create(sb, {
          title: args.title,
          content: args.content,
          visibility: args.visibility ?? 'public',
          tag_ids: args.tag_ids ?? [],
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
