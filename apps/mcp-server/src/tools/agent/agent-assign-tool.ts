import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerAgentAssignTool(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'assign_agent_tool',
    'Grant a tool to an AI Lenser. By default the tool is allowed; pass allowed=false to register a known-but-denied entry. Optional profile_id binds the assignment to a specific tool profile (config preset).',
    {
      ai_lenser_id: zUuid,
      tool_id: zUuid,
      profile_id: zUuid.optional(),
      allowed: z.boolean().default(true).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_assign_tool' as never, {
          p_ai_lenser_id: args.ai_lenser_id,
          p_tool_id: args.tool_id,
          p_profile_id: args.profile_id ?? null,
          p_allowed: args.allowed ?? true,
        })) as unknown as {
          data: unknown;
          error: { message: string } | null;
        };
        if (error) {
          if (error.message?.includes('access_denied')) {
            return fail('FORBIDDEN', 'You do not own this AI Lenser', {}, 'assign_agent_tool', t0);
          }
          throw new Error(error.message);
        }
        return ok(data, 'assign_agent_tool', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'assign_agent_tool', t0);
      }
    }
  );
}
