import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'start_agent_team_run';

export function registerAgentStartTeamRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
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
      const policy = args.policy ?? 'auto';
      try {
        const { team_run_id } = await agentService.startTeamRun(sb, {
          ai_lenser_id: args.ai_lenser_id,
          workflow_id: args.workflow_id,
          inputs: args.inputs ?? {},
          policy,
        });
        return ok(
          { team_run_id, ai_lenser_id: args.ai_lenser_id, workflow_id: args.workflow_id, policy },
          TOOL,
          t0
        );
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
