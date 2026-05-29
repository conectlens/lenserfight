import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentListRunEvents(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'list_agent_run_events',
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
        const { data, error } = (await sb.rpc('fn_agent_run_events' as never, {
          p_ai_lenser_id: args.ai_lenser_id,
          p_run_id: args.run_id ?? null,
          p_event_type: args.event_type ?? null,
          p_limit: args.limit ?? 100,
        })) as unknown as {
          data: unknown[] | null;
          error: { message: string } | null;
        };
        if (error) throw new Error(error.message);
        const items = data ?? [];
        return ok({ items, total: items.length }, 'list_agent_run_events', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'list_agent_run_events', t0);
      }
    }
  );
}
