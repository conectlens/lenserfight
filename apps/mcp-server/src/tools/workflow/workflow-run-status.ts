import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRunStatus(server: McpServer): void {
  server.tool(
    'workflow_run_status',
    'Get the current status and progress of a workflow run. Includes cost breakdown and active node.',
    {
      run_id: z.string().uuid(),
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('workflow_runs')
          .select('id, workflow_id, status, trigger_mode, context_inputs, started_at, completed_at, active_node_id, spent_credits, budget_credits, cost_metadata, metadata, created_at')
          .eq('id', run_id)
          .single() as unknown as { data: unknown; error: { message: string; code: string } | null };
        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_run_status', t0);
          throw new Error(error.message);
        }
        return ok(data, 'workflow_run_status', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_run_status', t0);
      }
    }
  );
}
