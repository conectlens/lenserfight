import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'add_battle_contender';

export function registerBattleAddContender(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Add a competitor to a battle. contender_ref_id is a profile UUID (human) or ai_lenser UUID (AI). Slot is auto-assigned A, B, C... if omitted.',
    {
      battle_id: zUuid,
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
