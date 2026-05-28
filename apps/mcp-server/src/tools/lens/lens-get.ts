import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerLensGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_get',
    'Get a lens with its head version details and full parameter list.',
    {
      lens_id: z.string().uuid('lens_id must be a valid UUID'),
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_get' as never, {
          p_lens_id: lens_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'lens_get', t0);
        return ok(data, 'lens_get', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_get', t0);
      }
    }
  );
}
