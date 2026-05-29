import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('revoke_agent_tool');
const TOOL = meta.name;

export function registerAgentRevokeTool(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    { ai_lenser_id: p.ai_lenser_id, tool_id: p.tool_id },
    async ({ ai_lenser_id, tool_id }) => {
      const t0 = Date.now();
      try {
        const revoked = await agentService.revokeTool(sb, { ai_lenser_id, tool_id });
        return ok({ ai_lenser_id, tool_id, revoked }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
