import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerWorkflowGet(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'get_workflow',
    'Get a workflow with its head version and scheduling info.',
    {
      workflow_id: zUuid,
    },
    async ({ workflow_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_workflow_get' as never, {
          p_workflow_id: workflow_id,
        })) as unknown as { data: unknown; error: { message: string } | null };

        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Workflow ${workflow_id} not found`, {}, 'get_workflow', t0);
        return ok(data, 'get_workflow', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'get_workflow', t0);
      }
    }
  );
}
