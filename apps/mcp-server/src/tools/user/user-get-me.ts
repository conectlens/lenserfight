import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

const TOOL = 'get_me';

export function registerUserGetMe(server: McpServer, sb: SupabaseClient, lenserId?: string): void {
  server.tool(
    TOOL,
    'Get the authenticated user\'s own lenser profile: id, handle, display_name, bio, status, type, and timestamps. Call this first when you need to know who the current user is before performing actions on their behalf.',
    {},
    async () => {
      const t0 = Date.now();
      if (!lenserId) {
        return fail('MISSING_LENSER', 'Not authenticated as a lenser. Complete onboarding first.', {}, TOOL, t0);
      }
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lenser_get_me' as never, {
          p_lenser_id: lenserId,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', 'Lenser profile not found', {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
