import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerBattleSubmitRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'battle_submit_run',
    'Submit an AI or human execution result for a battle contender. The content_text is the response to the battle task_prompt.',
    {
      battle_id: zUuid,
      contender_id: zUuid,
      content_text: z.string().min(1).max(100000),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = await sb.rpc('fn_battles_submit' as never, {
          p_battle_id: args.battle_id,
          p_contender_id: args.contender_id,
          p_content_text: args.content_text,
        }) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data ?? { submitted: true }, 'battle_submit_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_submit_run', t0);
      }
    }
  );
}
