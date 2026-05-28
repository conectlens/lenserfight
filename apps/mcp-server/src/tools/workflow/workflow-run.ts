import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

export function registerWorkflowRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'workflow_run',
    'Trigger a workflow execution with optional input parameters. Returns a run_id to track progress. Use workflow_run_status to poll.',
    {
      workflow_id: z.string().uuid(),
      inputs: z.record(z.string(), z.unknown()).default({}).optional(),
      global_model_id: z.string().optional(),
      idempotency_key: z.string().max(128).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_run_start' as never, {
          p_workflow_id: args.workflow_id,
          p_inputs: args.inputs ?? {},
          p_global_model_id: args.global_model_id ?? null,
          p_idempotency_key: args.idempotency_key ?? null,
          p_metadata: { mcp_tool: 'workflow_run' },
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        return ok({ ...((data as Record<string, unknown>) ?? {}), workflow_id: args.workflow_id }, 'workflow_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'workflow_run', t0);
      }
    }
  );
}
