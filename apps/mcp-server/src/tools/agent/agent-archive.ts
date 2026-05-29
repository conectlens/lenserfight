import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentArchive(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'archive_ai_lenser',
    'Archive an AI Lenser. Archived agents are hidden from default listings and cannot start new runs, but their history is preserved. Use restore_agent server-side (admin-only) to reactivate. confirm: true is required to prevent accidental archival.',
    {
      ai_lenser_id: zUuid,
      confirm: z.literal(true),
    },
    async ({ ai_lenser_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_archive_agent' as never, {
          p_ai_lenser_id: ai_lenser_id,
        })) as unknown as {
          data: unknown;
          error: { message: string } | null;
        };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'archive_ai_lenser', t0);
          }
          if (error.message?.includes('not_found')) {
            return fail('NOT_FOUND', `AI Lenser ${ai_lenser_id} not found`, {}, 'archive_ai_lenser', t0);
          }
          throw new Error(error.message);
        }
        return ok(data ?? { ai_lenser_id, status: 'archived' }, 'archive_ai_lenser', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'archive_ai_lenser', t0);
      }
    }
  );
}
