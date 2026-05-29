import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_ai_lenser';

export function registerAgentGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Get the full profile of one AI Lenser (AI Agent): handle, display_name, status, model binding, personality, policy summary, and ownership. Use list_ai_lensers first to discover ai_lenser_id.',
    { ai_lenser_id: zUuid },
    async ({ ai_lenser_id }) => {
      const t0 = Date.now();
      try {
        const data = await agentService.get(sb, ai_lenser_id);
        if (!data) return fail('NOT_FOUND', `AI Lenser ${ai_lenser_id} not found`, {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
