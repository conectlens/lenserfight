import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'archive_ai_lenser';

export function registerAgentArchive(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Archive an AI Lenser. Archived agents are hidden from default listings and cannot start new runs, but their history is preserved. Use restore_agent server-side (admin-only) to reactivate. confirm: true is required to prevent accidental archival.',
    {
      ai_lenser_id: zUuid,
      confirm: z.literal(true),
    },
    async ({ ai_lenser_id }) => {
      const t0 = Date.now();
      try {
        const data = await agentService.archive(sb, { ai_lenser_id });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `AI Lenser ${ai_lenser_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
