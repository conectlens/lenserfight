import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('update_ai_lenser');
const TOOL = meta.name;

export function registerAgentUpdate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      ai_lenser_id: p.ai_lenser_id,
      patch: z.record(z.string(), z.unknown()).refine((p) => Object.keys(p).length > 0, {
        message: 'patch must have at least one key',
      }),
    },
    async ({ ai_lenser_id, patch }) => {
      const t0 = Date.now();
      try {
        const { patched_keys } = await agentService.update(sb, { ai_lenser_id, patch });
        return ok({ ai_lenser_id, patched_keys }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
