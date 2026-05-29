import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentStartTeamRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'start_agent_team_run',
    `Start a team run for an AI Lenser against a workflow. Returns team_run_id you can poll via list_agent_run_events. Policy controls approval gating:

- "auto"   — runs immediately without owner approval (default)
- "manual" — creates the run in pending-approval state; owner must call decide_approval to release it

inputs is the initial input payload passed to the first node.

NOTE: The underlying RPC (agents.fn_start_team_run) is granted to service_role only. This tool works from the local stdio transport and from any caller authenticated with the service-role key. HTTP MCP sessions using an authenticated user token will receive a PERMISSION_DENIED error.`,
    {
      ai_lenser_id: zUuid,
      workflow_id: zUuid,
      inputs: z.record(z.string(), z.unknown()).default({}).optional(),
      policy: z.enum(['auto', 'manual']).default('auto').optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb
          .schema('agents' as never)
          .rpc('fn_start_team_run' as never, {
            p_ai_lenser_id: args.ai_lenser_id,
            p_workflow_id: args.workflow_id,
            p_inputs: args.inputs ?? {},
            p_policy: args.policy ?? 'auto',
          })) as unknown as {
          data: string | null;
          error: { message: string } | null;
        };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'start_agent_team_run', t0);
          }
          if (error.message?.includes('quota_exceeded')) {
            return fail('THROTTLED', 'Daily team-run quota exceeded for this AI Lenser', {}, 'start_agent_team_run', t0);
          }
          throw new Error(error.message);
        }
        if (!data) return fail('NOT_FOUND', 'Failed to start team run — agent or workflow missing', {}, 'start_agent_team_run', t0);
        return ok({ team_run_id: data, ai_lenser_id: args.ai_lenser_id, workflow_id: args.workflow_id, policy: args.policy ?? 'auto' }, 'start_agent_team_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'start_agent_team_run', t0);
      }
    }
  );
}
