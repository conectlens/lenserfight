import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CapturedTool {
  name: string;
  description: string;
  paramsSchema: unknown;
  handler: (args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

/**
 * Mock McpServer that captures the registered tool so a unit test can invoke
 * its handler directly with arbitrary args.
 */
export function captureTool(
  register: (server: McpServer, sb: SupabaseClient) => void
): CapturedTool {
  let captured: CapturedTool | null = null;
  const server = {
    tool: (name: string, description: string, paramsSchema: unknown, handler: unknown) => {
      captured = {
        name,
        description,
        paramsSchema,
        handler: handler as CapturedTool['handler'],
      };
    },
  } as unknown as McpServer;
  register(server, {} as SupabaseClient);
  if (!captured) throw new Error('Tool register did not call server.tool');
  return captured;
}

export function parseEnvelope(result: { content: Array<{ type: string; text: string }> }): {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string; details: unknown };
  meta: { tool: string; timestamp: string; elapsed_ms: number };
} {
  return JSON.parse(result.content[0].text);
}
