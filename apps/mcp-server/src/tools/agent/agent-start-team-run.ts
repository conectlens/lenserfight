import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('start_agent_team_run');
const TOOL = meta.name;

export function registerAgentStartTeamRun(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      ai_lenser_id: p.ai_lenser_id,
      workflow_id: p.workflow_id,
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
