import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'list_agent_tools';

export function registerAgentListTools(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'List the tools assigned to an AI Lenser — what it is allowed to invoke during a team run. Each row is a tool_assignment with tool metadata. Use cursor (last tool_assignment.id) for keyset pagination.',
    {
      ai_lenser_id: zUuid,
      limit: z.number().int().min(1).max(200).default(50).optional(),
      cursor: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 50;
      try {
        const { items, total, next_cursor } = await agentService.listTools(sb, {
          ai_lenser_id: args.ai_lenser_id,
          limit,
          cursor: args.cursor ?? null,
        });
        return ok({ items, total, limit, next_cursor }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
