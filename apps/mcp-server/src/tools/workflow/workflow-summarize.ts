import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerWorkflowSummarize(server: McpServer): void {
  server.tool(
    'workflow_summarize',
    'Summarize a completed workflow run: status, cost, duration, and key output counts.',
    {
      run_id: z.string().uuid(),
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');

        const { data: run, error } = await schema
          .from('workflow_runs')
          .select('id, workflow_id, status, started_at, completed_at, spent_credits, budget_credits, cost_metadata, context_inputs, metadata')
          .eq('id', run_id)
          .single() as unknown as { data: Record<string, unknown> | null; error: { message: string; code: string } | null };

        if (error) {
          if (error.code === 'PGRST116') return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_summarize', t0);
          throw new Error(error.message);
        }
        if (!run) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_summarize', t0);

        const startedAt = run['started_at'] ? new Date(run['started_at'] as string).getTime() : null;
        const completedAt = run['completed_at'] ? new Date(run['completed_at'] as string).getTime() : null;
        const durationMs = startedAt && completedAt ? completedAt - startedAt : null;

        const { data: nodeResults } = await schema
          .from('workflow_node_results' as never)
          .select('status')
          .eq('run_id', run_id) as unknown as { data: Array<{ status: string }> | null };

        const nodes = nodeResults ?? [];
        const summary = {
          run_id,
          workflow_id: run['workflow_id'],
          status: run['status'],
          duration_ms: durationMs,
          spent_credits: run['spent_credits'],
          budget_credits: run['budget_credits'],
          cost_metadata: run['cost_metadata'],
          nodes: {
            total: nodes.length,
            completed: nodes.filter((n) => n.status === 'completed').length,
            failed: nodes.filter((n) => n.status === 'failed').length,
            skipped: nodes.filter((n) => n.status === 'skipped').length,
          },
        };

        return ok(summary, 'workflow_summarize', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_summarize', t0);
      }
    }
  );
}
