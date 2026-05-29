import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'update_ai_lenser';

export function registerAgentUpdate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    'Patch an AI Lenser profile. Pass only the fields you want to change in `patch` — display_name, bio, avatar_url, ai_model_id, etc. The RPC validates allowed keys server-side and ignores unknown fields.',
    {
      ai_lenser_id: zUuid,
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
