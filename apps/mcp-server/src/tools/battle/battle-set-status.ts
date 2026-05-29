import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

const DESTRUCTIVE_STATUSES = new Set(['closed', 'archived']);

export function registerBattleSetStatus(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'set_battle_status',
    'Transition a battle to a new status. The DB enforces legal transitions — illegal moves are rejected. Closing or archiving requires confirm: true.',
    {
      battle_id: zUuid,
      status: z.enum(['open','executing','voting','scoring','closed','published','archived']),
      confirm: z.literal(true).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      if (DESTRUCTIVE_STATUSES.has(args.status) && !args.confirm) {
        return fail('CONFIRMATION_REQUIRED', `Setting status to "${args.status}" requires confirm: true`, {}, 'set_battle_status', t0);
      }
      try {
        const { data, error } = (await sb.rpc('fn_mcp_battle_set_status' as never, {
          p_battle_id: args.battle_id,
          p_status: args.status,
        })) as unknown as { data: unknown; error: { message: string } | null };

        if (error) {
          if (error.message?.includes('battle_not_found')) return fail('NOT_FOUND', `Battle ${args.battle_id} not found`, {}, 'set_battle_status', t0);
          if (error.message?.includes('access_denied')) return fail('FORBIDDEN', 'You do not own this battle', {}, 'set_battle_status', t0);
          if (error.message?.includes('invalid_status_transition') || error.message?.includes('transition')) {
            return fail('INVALID_TRANSITION', error.message, {}, 'set_battle_status', t0);
          }
          throw new Error(error.message);
        }
        return ok(data, 'set_battle_status', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'set_battle_status', t0);
      }
    }
  );
}
