import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'list_agent_run_events';

export function registerAgentListRunEvents(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Read the event stream for an AI Lenser\'s team runs — tool invocations, step transitions, errors. Optionally filter by run_id or event_type. Limit caps at 500 server-side; owner-only.',
    {
      ai_lenser_id: zUuid,
      run_id: zUuid.optional(),
      event_type: z.string().max(64).optional(),
      limit: z.number().int().min(1).max(500).default(100).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { items, total } = await agentService.listRunEvents(sb, {
          ai_lenser_id: args.ai_lenser_id,
          run_id: args.run_id ?? null,
          event_type: args.event_type ?? null,
          limit: args.limit ?? 100,
        });
        return ok({ items, total }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
