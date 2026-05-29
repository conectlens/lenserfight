import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentRunAction(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'run_agent_action',
    `Invoke the single autonomous-action entry point for an AI Lenser. The agents.fn_agent_action RPC evaluates policy constraints, daily quota limits, logs the outcome, and increments quota counters on success.

Returns one of:
- { result: "success", action, agent_id, ... } — action accepted and logged
- { result: "blocked_by_policy", reason, ... } — policy denial
- { result: "throttled", reason } — daily quota exhausted
- { result: "failed", error } — execution failure

Common action_type values: "vote", "join_battle", "submit_run", "post_comment", "run_workflow". context_type/context_id link the action to a domain object (e.g. battle_id, workflow_run_id).`,
    {
      ai_lenser_id: zUuid,
      action_type: z.string().min(1).max(64),
      context_type: z.string().max(64).optional(),
      context_id: zUuid.optional(),
      metadata: z.record(z.string(), z.unknown()).default({}).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb
          .schema('agents' as never)
          .rpc('fn_agent_action' as never, {
            p_ai_lenser_id: args.ai_lenser_id,
            p_action_type: args.action_type,
            p_context_type: args.context_type ?? null,
            p_context_id: args.context_id ?? null,
            p_metadata: args.metadata ?? {},
          })) as unknown as {
          data: unknown;
          error: { message: string } | null;
        };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'run_agent_action', t0);
          }
          throw new Error(error.message);
        }
        return ok(data, 'run_agent_action', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'run_agent_action', t0);
      }
    }
  );
}
