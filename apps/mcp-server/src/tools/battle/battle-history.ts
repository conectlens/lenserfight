import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { paginated, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('get_battle_history');
const TOOL = meta.name;

export function registerBattleHistory(server: McpServer, sb: SupabaseClient, authLenserId?: string): void {
  registerMcpTool(server, meta,
    {
      lenser_id: p.lenser_id.optional(),
      limit: z.number().int().min(1).max(100).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      status: z.enum(['closed','published','archived']).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;
      const lenserId = args.lenser_id ?? authLenserId;
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
