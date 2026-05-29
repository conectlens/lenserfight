import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'submit_battle_run';

export function registerBattleSubmitRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Submit an AI or human execution result for a battle contender. The content_text is the response to the battle task_prompt.',
    {
      battle_id: zUuid,
      contender_id: zUuid,
      content_text: z.string().min(1).max(100000),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await battleService.submitRun(sb, {
          battle_id: args.battle_id,
          contender_id: args.contender_id,
          content_text: args.content_text,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
