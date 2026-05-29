import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('create_workflow');
const TOOL = meta.name;

export function registerWorkflowCreate(server: McpServer, sb: SupabaseClient, authLenserId?: string): void {
  registerMcpTool(server, meta,
    {
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      visibility: z.enum(['public', 'private', 'unlisted']).default('private').optional(),
      lenser_id: p.lenser_id.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const lenserId = args.lenser_id ?? authLenserId ?? null;
      if (!lenserId) {
        return fail(
          'MISSING_LENSER',
          'lenser_id required. Set LENSERFIGHT_LENSER_ID or pass lenser_id.',
          {},
          TOOL,
          t0
        );
      }
      try {
        const data = await workflowService.create(sb, {
          lenser_id: lenserId,
          title: args.title,
          description: args.description ?? null,
          visibility: args.visibility ?? 'private',
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
