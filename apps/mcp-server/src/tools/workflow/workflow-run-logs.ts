import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRunLogs(server: McpServer): void {
  server.tool(
    'workflow_run_logs',
    'Get execution logs and node outputs for a workflow run, ordered by time.',
    {
      run_id: z.string().uuid(),
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');

        const { data: nodeResults, error } = await schema
          .from('workflow_node_results' as never)
          .select('id, node_id, status, output, error_message, started_at, completed_at, tokens_used, cost_credits')
          .eq('run_id', run_id)
          .order('started_at', { ascending: true }) as unknown as { data: unknown[] | null; error: { message: string; code: string } | null };

        if (error && error.code !== '42P01') throw new Error(error.message);

        const { data: run } = await schema
          .from('workflow_runs')
          .select('id, status, metadata, cost_metadata, started_at, completed_at')
          .eq('id', run_id)
          .single() as unknown as { data: unknown; error: unknown };

        return ok({ run, node_results: nodeResults ?? [] }, 'workflow_run_logs', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_run_logs', t0);
      }
    }
  );
}
