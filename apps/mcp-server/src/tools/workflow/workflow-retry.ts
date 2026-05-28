import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRetry(server: McpServer): void {
  server.tool(
    'workflow_retry',
    'Retry a failed or cancelled workflow run with the same inputs. Creates a new run linked to the original via parent_run_id.',
    {
      run_id: z.string().uuid(),
    },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');

        const { data: original, error: fetchErr } = await schema
          .from('workflow_runs')
          .select('id, workflow_id, context_inputs, global_model_id, status')
          .eq('id', run_id)
          .single() as unknown as { data: { workflow_id: string; context_inputs: unknown; global_model_id: string | null; status: string } | null; error: { message: string; code: string } | null };

        if (fetchErr) {
          if (fetchErr.code === 'PGRST116') return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_retry', t0);
          throw new Error(fetchErr.message);
        }
        if (!original) return fail('NOT_FOUND', `Run ${run_id} not found`, {}, 'workflow_retry', t0);

        const { data: newRun, error: insertErr } = await schema
          .from('workflow_runs')
          .insert({
            workflow_id: original.workflow_id,
            status: 'pending',
            trigger_mode: 'manual',
            context_inputs: original.context_inputs,
            global_model_id: original.global_model_id,
            parent_run_id: run_id,
            metadata: { mcp_tool: 'workflow_retry', retried_from: run_id },
          })
          .select('id, status, created_at')
          .single() as unknown as { data: unknown; error: { message: string } | null };

        if (insertErr) throw new Error(insertErr.message);
        return ok({ new_run: newRun, original_run_id: run_id }, 'workflow_retry', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_retry', t0);
      }
    }
  );
}
