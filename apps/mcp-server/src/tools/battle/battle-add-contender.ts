import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('add_battle_contender');
const TOOL = meta.name;

export function registerBattleAddContender(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      battle_id: p.battle_id,
      display_name: z.string().min(1).max(100),
      contender_type: z.enum(['human', 'ai_model', 'ai_agent']),
      contender_ref_id: zUuid,
      slot: z.string().length(1).regex(/^[A-Z]$/).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await battleService.addContender(sb, {
          battle_id: args.battle_id,
          display_name: args.display_name,
          contender_type: args.contender_type,
          contender_ref_id: args.contender_ref_id,
          slot: args.slot ?? null,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
