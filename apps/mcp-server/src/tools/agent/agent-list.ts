import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'list_ai_lensers';

export function registerAgentList(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'List AI Lensers (AI Agents) owned by a human lenser. Returns each agent\'s profile snapshot — id, handle, display_name, ai_model_id, status, created_at — so the caller can pick one to inspect or operate on. Pass owner_lenser_id to scope; defaults to LENSERFIGHT_LENSER_ID env var when omitted.',
    {
      owner_lenser_id: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const owner = args.owner_lenser_id ?? process.env.LENSERFIGHT_LENSER_ID;
      if (!owner) {
        return fail(
          'MISSING_LENSER',
          'owner_lenser_id required. Set LENSERFIGHT_LENSER_ID or pass owner_lenser_id.',
          {},
          TOOL,
          t0
        );
      }
      try {
        const { items, total } = await agentService.list(sb, { owner_lenser_id: owner });
        return ok({ items, total, owner_lenser_id: owner }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
