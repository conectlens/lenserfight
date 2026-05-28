import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRun(server: McpServer): void {
  server.tool(
    'workflow_run',
    'Trigger a workflow execution with optional input parameters. Returns a run_id to track progress. Use workflow_run_status to poll.',
    {
      workflow_id: z.string().uuid(),
      inputs: z.record(z.unknown()).default({}).optional(),
      global_model_id: z.string().optional(),
      idempotency_key: z.string().max(128).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const sb = getServiceClient();
        const { data, error } = await (sb as never as { schema: (s: string) => typeof sb })
          .schema('lenses')
          .from('workflow_runs')
          .insert({
            workflow_id: args.workflow_id,
            status: 'pending',
            trigger_mode: 'manual',
            context_inputs: args.inputs ?? {},
            global_model_id: args.global_model_id ?? null,
            idempotency_key: args.idempotency_key ?? null,
            metadata: { mcp_tool: 'workflow_run' },
          })
          .select('id, status, created_at')
          .single() as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok({ ...((data as Record<string, unknown>) ?? {}), workflow_id: args.workflow_id }, 'workflow_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_run', t0);
      }
    }
  );
}
