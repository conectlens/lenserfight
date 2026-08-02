import { composeLensPayload } from '@lenserfight/api/export-payloads';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';

import { McpError } from '../../services/mcp-error.js';
import { ok, fail } from '../../types.js';
import { runMcpExport, sbRpcCaller } from '../export-runtime.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { p } from '../tool-params.js';

const meta = getToolMeta('export_lens');
const TOOL = meta.name;

export function registerLensExport(server: McpServer, sb: SupabaseClient, userId?: string): void {
  registerMcpTool(server, meta,
    { lens_id: p.lens_id, export_format: p.export_format },
    async ({ lens_id, export_format }) => {
      const t0 = Date.now();
      try {
        const payload = await composeLensPayload(sbRpcCaller(sb), lens_id);
        const result = await runMcpExport('lens', payload.slug, payload.title, payload, export_format, userId);
        return ok(result, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
