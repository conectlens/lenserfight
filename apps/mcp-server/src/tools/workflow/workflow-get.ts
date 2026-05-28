import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerWorkflowGet(server: McpServer): void {
  server.tool(
    'workflow_get',
    'Get a workflow with its head version and scheduling info.',
    {
      workflow_id: z.string().uuid(),
    },
    async ({ workflow_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('workflows')
          .select('id, lenser_id, title, description, visibility, battle_count, fork_count, head_version_id, created_at, updated_at')
          .eq('id', workflow_id)
          .is('deleted_at', null)
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };

        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Workflow ${workflow_id} not found`, {}, 'workflow_get', t0);
          throw new Error(error.message);
        }
        return ok(data, 'workflow_get', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_get', t0);
      }
    }
  );
}
