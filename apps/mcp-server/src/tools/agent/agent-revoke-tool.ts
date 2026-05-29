import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'revoke_agent_tool';

export function registerAgentRevokeTool(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Revoke a tool assignment from an AI Lenser. The assignment row is removed; in-flight invocations of this tool fail with a permission error. Returns true on revoke, false if there was no assignment.',
    { ai_lenser_id: zUuid, tool_id: zUuid },
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
