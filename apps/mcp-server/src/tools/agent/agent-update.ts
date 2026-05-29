import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentUpdate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'update_ai_lenser',
    'Patch an AI Lenser profile. Pass only the fields you want to change in `patch` — display_name, bio, avatar_url, ai_model_id, etc. The RPC validates allowed keys server-side and ignores unknown fields.',
    {
      ai_lenser_id: zUuid,
      patch: z.record(z.string(), z.unknown()).refine((p) => Object.keys(p).length > 0, {
        message: 'patch must have at least one key',
      }),
    },
    async ({ ai_lenser_id, patch }) => {
      const t0 = Date.now();
      try {
        const { error } = (await sb.rpc('fn_update_agent_profile' as never, {
          p_ai_lenser_id: ai_lenser_id,
          p_patch: patch,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'update_ai_lenser', t0);
          }
          throw new Error(error.message);
        }
        return ok({ ai_lenser_id, patched_keys: Object.keys(patch) }, 'update_ai_lenser', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'update_ai_lenser', t0);
      }
    }
  );
}
