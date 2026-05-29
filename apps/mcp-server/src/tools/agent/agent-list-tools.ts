import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentListTools(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'list_agent_tools',
    'List the tools assigned to an AI Lenser — what it is allowed to invoke during a team run. Each row is a tool_assignment with tool metadata. Use cursor (last tool_assignment.id) for keyset pagination.',
    {
      ai_lenser_id: zUuid,
      limit: z.number().int().min(1).max(200).default(50).optional(),
      cursor: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_list_agent_tools' as never, {
          p_ai_lenser_id: args.ai_lenser_id,
          p_limit: args.limit ?? 50,
          p_cursor: args.cursor ?? null,
        })) as unknown as {
          data: unknown[] | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        const items = data ?? [];
        return ok(
          {
            items,
            total: items.length,
            limit: args.limit ?? 50,
            next_cursor: items.length === (args.limit ?? 50)
              ? (items[items.length - 1] as { id?: string })?.id ?? null
              : null,
          },
          'list_agent_tools',
          t0
        );
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'list_agent_tools', t0);
      }
    }
  );
}
