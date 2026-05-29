import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('get_battle_score');
const TOOL = meta.name;

export function registerBattleScore(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    { battle_id: p.battle_id },
    async ({ battle_id }) => {
      const t0 = Date.now();
      try {
        const data = await battleService.score(sb, battle_id);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
