import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'create_ai_lenser';

export function registerAgentCreate(server: McpServer, sb: SupabaseClient, lenserId?: string): void {
  server.tool(
    TOOL,
    'Create a new AI Lenser (AI Agent) owned by the authenticated lenser. The handle is the @ identifier and must be globally unique among lensers. ai_model_id is optional at creation — bind a model later via update_ai_lenser. owner_lenser_id defaults to the authenticated user.',
    {
      handle: z.string().min(1).max(64),
      display_name: z.string().min(1).max(120),
      ai_model_id: zUuid.optional(),
      owner_lenser_id: zUuid.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const owner = args.owner_lenser_id ?? lenserId;
      if (!owner) {
        return fail(
          'MISSING_LENSER',
          'owner_lenser_id required. Set LENSERFIGHT_LENSER_ID or pass owner_lenser_id.',
          {},
          TOOL,
          t0
        );
      }
      try {
        const data = await agentService.create(sb, {
          owner_lenser_id: owner,
          handle: args.handle,
          display_name: args.display_name,
          ai_model_id: args.ai_model_id ?? null,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) {
          // Enrich CONFLICT with the offending handle for nicer client UX.
          const details = e.code === 'CONFLICT' ? { handle: args.handle } : e.details;
          const message = e.code === 'CONFLICT' ? `Handle "@${args.handle}" is already in use` : e.message;
          return fail(e.code, message, details, TOOL, t0);
        }
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
