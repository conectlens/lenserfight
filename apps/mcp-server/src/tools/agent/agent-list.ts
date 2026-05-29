import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('list_ai_lensers');
const TOOL = meta.name;

export function registerAgentList(server: McpServer, sb: SupabaseClient, lenserId?: string): void {
  registerMcpTool(
    server,
    meta,
    {
      owner_lenser_id: p.owner_lenser_id.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const owner = args.owner_lenser_id ?? lenserId;
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
