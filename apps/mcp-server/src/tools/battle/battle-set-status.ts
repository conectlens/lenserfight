import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

const DESTRUCTIVE_STATUSES = new Set(['closed', 'archived']);

export function registerBattleSetStatus(server: McpServer): void {
  server.tool(
    'battle_set_status',
    'Transition a battle to a new status. The DB enforces legal transitions — illegal moves are rejected. Closing or archiving requires confirm: true.',
    {
      battle_id: z.string().uuid(),
      status: z.enum(['open','executing','voting','scoring','closed','published','archived']),
      confirm: z.literal(true).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      if (DESTRUCTIVE_STATUSES.has(args.status) && !args.confirm) {
        return fail('CONFIRMATION_REQUIRED', `Setting status to "${args.status}" requires confirm: true`, {}, 'battle_set_status', t0);
      }
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('battles')
          .from('battles')
          .update({ status: args.status, updated_at: new Date().toISOString() })
          .eq('id', args.battle_id)
          .is('deleted_at', null)
          .select('id, status')
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };

        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Battle ${args.battle_id} not found`, {}, 'battle_set_status', t0);
          if (error.message?.includes('invalid_status_transition') || error.message?.includes('transition')) {
            return fail('INVALID_TRANSITION', error.message, {}, 'battle_set_status', t0);
          }
          throw new Error(error.message);
        }
        return ok(data, 'battle_set_status', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_set_status', t0);
      }
    }
  );
}
