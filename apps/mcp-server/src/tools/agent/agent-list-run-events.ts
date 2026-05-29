import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('list_agent_run_events');
const TOOL = meta.name;

export function registerAgentListRunEvents(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      ai_lenser_id: p.ai_lenser_id,
      run_id: p.workflow_run_id.optional(),
      event_type: z.string().max(64).optional(),
      limit: z.number().int().min(1).max(500).default(100).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { items, total } = await agentService.listRunEvents(sb, {
          ai_lenser_id: args.ai_lenser_id,
          run_id: args.run_id ?? null,
          event_type: args.event_type ?? null,
          limit: args.limit ?? 100,
        });
        return ok({ items, total }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
