import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('list_battles');
const TOOL = meta.name;

export function registerBattleList(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      status: z.enum(['draft','open','executing','voting','scoring','closed','published','archived']).optional(),
      battle_type: z.enum(['ai_vs_ai','human_vs_human_ai_votes','human_vs_human_open_votes','human_vs_ai','workflow_battle','lenser_battle']).optional(),
      creator_lenser_id: p.lenser_id.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      try {
        const { items, total } = await battleService.list(sb, {
          limit,
          offset,
          status: args.status,
          battle_type: args.battle_type,
          creator_lenser_id: args.creator_lenser_id,
        });
        return paginated(items, total, limit, offset, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
