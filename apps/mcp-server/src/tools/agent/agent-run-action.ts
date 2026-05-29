import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'run_agent_action';

export function registerAgentRunAction(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
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
        const data = await agentService.runAction(sb, {
          ai_lenser_id: args.ai_lenser_id,
          action_type: args.action_type,
          context_type: args.context_type ?? null,
          context_id: args.context_id ?? null,
          metadata: args.metadata ?? {},
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
