import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('run_workflow');
const TOOL = meta.name;

export function registerWorkflowRun(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      workflow_id: p.workflow_id,
      inputs: z.record(z.string(), z.unknown()).default({}).optional(),
      global_model_id: z.string().optional(),
      idempotency_key: z.string().max(128).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const data = await workflowService.startRun(sb, {
          workflow_id: args.workflow_id,
          inputs: args.inputs ?? {},
          global_model_id: args.global_model_id ?? null,
          idempotency_key: args.idempotency_key ?? null,
          metadata: { mcp_tool: TOOL },
        });
        return ok(
          { ...((data as unknown as Record<string, unknown>) ?? {}), workflow_id: args.workflow_id },
          TOOL,
          t0
        );
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
