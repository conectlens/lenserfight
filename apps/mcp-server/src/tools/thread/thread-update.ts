import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { McpError } from '../../services/mcp-error.js';
import { threadService } from '../../services/thread.service.js';
import { ok, fail } from '../../types.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { p } from '../tool-params.js';

const meta = getToolMeta('update_thread');
const TOOL = meta.name;

export function registerThreadUpdate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      thread_id: p.thread_id,
      title: z.string().min(1).max(200).optional().describe('New title. Requires content to also be set or already present.'),
      content: z.string().min(1).optional().describe('New body content.'),
      visibility: z.enum(['public', 'community', 'private']).optional().describe('New visibility.'),
    },
    async (args) => {
      const t0 = Date.now();
      if (args.title == null && args.content == null && args.visibility == null) {
        return fail(
          'VALIDATION_ERROR',
          'Provide at least one of title, content, or visibility to update.',
          {},
          TOOL,
          t0
        );
      }
      try {
        await threadService.update(sb, {
          thread_id: args.thread_id,
          title: args.title,
          content: args.content,
          visibility: args.visibility,
        });
        return ok({ thread_id: args.thread_id, updated: true }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `Thread ${args.thread_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
