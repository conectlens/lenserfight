import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('assign_agent_tool');
const TOOL = meta.name;

export function registerAgentAssignTool(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      ai_lenser_id: p.ai_lenser_id,
      tool_id: p.tool_id,
      profile_id: zUuid.optional(),
      allowed: z.boolean().default(true).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await agentService.assignTool(sb, {
          ai_lenser_id: args.ai_lenser_id,
          tool_id: args.tool_id,
          profile_id: args.profile_id ?? null,
          allowed: args.allowed ?? true,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
