import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('retry_workflow');
const TOOL = meta.name;

export function registerWorkflowRetry(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    { run_id: p.workflow_run_id },
    async ({ run_id }) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.retry(sb, run_id);
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          const message = e.code === 'NOT_FOUND' ? `Run ${run_id} not found` : e.message;
          return fail(e.code, message, e.details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
