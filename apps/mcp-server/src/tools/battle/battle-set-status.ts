import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('set_battle_status');
const TOOL = meta.name;
const DESTRUCTIVE_STATUSES = new Set(['closed', 'archived']);

export function registerBattleSetStatus(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      battle_id: p.battle_id,
      status: z.enum(['open','executing','voting','scoring','closed','published','archived']),
      confirm: z.literal(true).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      if (DESTRUCTIVE_STATUSES.has(args.status) && !args.confirm) {
        return fail(
          'CONFIRMATION_REQUIRED',
          `Setting status to "${args.status}" requires confirm: true`,
          {},
          TOOL,
          t0
        );
      }
      try {
        const data = await battleService.setStatus(sb, {
          battle_id: args.battle_id,
          status: args.status,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `Battle ${args.battle_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
