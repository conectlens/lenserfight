import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('run_agent_action');
const TOOL = meta.name;

export function registerAgentRunAction(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      ai_lenser_id: p.ai_lenser_id,
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
