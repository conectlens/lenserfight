import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('get_lens_version');
const TOOL = meta.name;

export function registerLensGetVersion(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      lens_id: p.lens_id,
      version_id: p.lens_version_id.optional(),
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
