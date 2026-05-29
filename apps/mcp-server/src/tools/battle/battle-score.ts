import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_battle_score';

export function registerBattleScore(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Read scoring data for a battle: vote aggregates per contender and any AI judge verdicts.',
    { battle_id: zUuid },
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
