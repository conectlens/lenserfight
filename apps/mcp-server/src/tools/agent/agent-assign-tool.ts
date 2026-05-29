import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { agentService } from '../../services/agent.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'assign_agent_tool';

export function registerAgentAssignTool(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
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
        const data = await agentService.assignTool(sb, {
          ai_lenser_id: args.ai_lenser_id,
          tool_id: args.tool_id,
          profile_id: args.profile_id ?? null,
          allowed: args.allowed ?? true,
        });
        return ok(data, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
