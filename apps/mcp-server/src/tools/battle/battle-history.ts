import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail, zUuid } from '../../types.js';
import { getConfig } from '../../config.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_battle_history';

export function registerBattleHistory(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Get structured battle history for a lenser — battles they created or participated in, with outcomes.',
    {
      lenser_id: zUuid.optional(),
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      status: z.enum(['closed','published','archived']).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      const lenserId = args.lenser_id ?? getConfig().lenserId;
      try {
        const { items, total } = await battleService.history(sb, {
          lenser_id: lenserId ?? null,
          limit,
          offset,
          status: args.status,
        });
        return paginated(items, total, limit, offset, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
