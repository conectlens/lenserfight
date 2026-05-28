import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensGetVersion(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_get_version',
    'Get a specific lens version by its ID or semver string. Returns the full template body and parameter list.',
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
      semver: z.string().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      if (!args.version_id && !args.semver) {
        return fail('BAD_INPUT', 'Provide version_id or semver', {}, 'lens_get_version', t0);
      }
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_get_version' as never, {
          p_lens_id: args.lens_id,
          p_version_id: args.version_id ?? null,
          p_semver: args.semver ?? null,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', 'Version not found', {}, 'lens_get_version', t0);
        return ok(data, 'lens_get_version', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_get_version', t0);
      }
    }
  );
}
