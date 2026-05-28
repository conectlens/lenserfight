import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_get',
    'Fetch a single lens with full metadata: title, description, content (rendered preview), author, tags, language, and its head version including the template body, input/output contracts, and parameter list. Call this after lens_list / lens_search when you need the actual template + parameters to execute a lens via lens_run.',
    {
      lens_id: zUuid,
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
