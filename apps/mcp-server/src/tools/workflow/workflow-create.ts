import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { getConfig } from '../../config.js';

export function registerWorkflowCreate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'create_workflow',
    'Create a new workflow. Workflows are reusable multi-step execution containers that chain lens runs and AI operations.',
    {
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      visibility: z.enum(['public', 'private', 'unlisted']).default('private').optional(),
      lenser_id: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const lenserId = args.lenser_id ?? getConfig().lenserId ?? null;
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_create' as never, {
          p_title: args.title,
          p_description: args.description ?? null,
          p_visibility: args.visibility ?? 'private',
          p_lenser_id: lenserId,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) {
          if (error.message?.includes('missing_lenser_id')) {
            return fail('MISSING_LENSER', 'lenser_id required. Set LENSERFIGHT_LENSER_ID or pass lenser_id.', {}, 'create_workflow', t0);
          }
          throw new Error(error.message);
        }
        return ok(data, 'create_workflow', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'create_workflow', t0);
      }
    }
  );
}
