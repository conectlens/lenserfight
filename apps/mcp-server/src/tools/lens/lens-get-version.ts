import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'get_lens_version';

export function registerLensGetVersion(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Get a specific lens version by its ID or semver string. Returns the full template body and parameter list.',
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
      semver: z.string().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      if (!args.version_id && !args.semver) {
        return fail('BAD_INPUT', 'Provide version_id or semver', {}, TOOL, t0);
      }
      try {
        const data = await lensService.getVersion(sb, {
          lens_id: args.lens_id,
          version_id: args.version_id,
          semver: args.semver,
        });
        if (!data) return fail('NOT_FOUND', 'Version not found', {}, TOOL, t0);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
