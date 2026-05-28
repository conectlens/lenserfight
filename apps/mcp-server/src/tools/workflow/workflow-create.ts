import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';
import { getConfig } from '../../config.js';

export function registerWorkflowCreate(server: McpServer): void {
  server.tool(
    'workflow_create',
    'Create a new workflow. Workflows are reusable multi-step execution containers that chain lens runs and AI operations.',
    {
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      visibility: z.enum(['public', 'private', 'unlisted']).default('private').optional(),
      lenser_id: z.string().uuid().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const lenserId = args.lenser_id ?? getConfig().lenserId;
      if (!lenserId) return fail('MISSING_LENSER', 'lenser_id required. Set LENSERFIGHT_LENSER_ID or pass lenser_id.', {}, 'workflow_create', t0);
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('workflows')
          .insert({
            lenser_id: lenserId,
            title: args.title,
            description: args.description ?? null,
            visibility: args.visibility ?? 'private',
          })
          .select('id, title, visibility, created_at')
          .single() as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok(data, 'workflow_create', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_create', t0);
      }
    }
  );
}
