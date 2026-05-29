import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentCreate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'create_ai_lenser',
    'Create a new AI Lenser (AI Agent) owned by a human lenser. The handle is the @ identifier and must be globally unique among lensers. ai_model_id is optional at creation — bind a model later via update_ai_lenser. owner_lenser_id defaults to LENSERFIGHT_LENSER_ID env var.',
    {
      handle: z.string().min(1).max(64),
      display_name: z.string().min(1).max(120),
      ai_model_id: zUuid.optional(),
      owner_lenser_id: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const owner = args.owner_lenser_id ?? process.env.LENSERFIGHT_LENSER_ID;
      if (!owner) {
        return fail(
          'MISSING_LENSER',
          'owner_lenser_id required. Set LENSERFIGHT_LENSER_ID or pass owner_lenser_id.',
          {},
          'create_ai_lenser',
          t0
        );
      }
      try {
        const { data, error } = (await sb.rpc('fn_create_ai_lenser' as never, {
          p_owner_lenser_id: owner,
          p_handle: args.handle,
          p_display_name: args.display_name,
          p_ai_model_id: args.ai_model_id ?? null,
        })) as unknown as {
          data: unknown;
          error: { message: string } | null;
        };
        if (error) {
          if (error.message?.includes('handle_taken')) {
            return fail('CONFLICT', `Handle "@${args.handle}" is already in use`, { handle: args.handle }, 'create_ai_lenser', t0);
          }
          throw new Error(error.message);
        }
        return ok(data, 'create_ai_lenser', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'create_ai_lenser', t0);
      }
    }
  );
}
