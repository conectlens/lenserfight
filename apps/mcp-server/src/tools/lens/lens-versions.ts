import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensVersions(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_versions',
    'List all versions of a lens ordered newest-first. Each version is immutable — new edits create new versions.',
    {
      lens_id: zUuid,
    },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_versions' as never, {
          p_lens_id: lens_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data ?? { lens_id, versions: [], count: 0 }, 'lens_versions', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_versions', t0);
      }
    }
  );
}
