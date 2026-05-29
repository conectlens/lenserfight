import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

/** MCP tool identity and model-facing documentation (see MCP 2025-11-25 tools spec). */
export interface McpToolMeta {
  /** Stable machine identifier (verb_noun snake_case). */
  name: string;
  /** Human-readable label for UIs; never snake_case. */
  title: string;
  /** Detailed guidance for AI clients: purpose, when to call, outcomes, related tools. */
  description: string;
  /** Optional behavioral hints (read-only, destructive, etc.). */
  annotations?: ToolAnnotations;
}

export function registerMcpTool<Args extends ZodRawShapeCompat>(
  server: McpServer,
  meta: McpToolMeta,
  inputSchema: Args,
  handler: ToolCallback<Args>
): void {
  server.registerTool(
    meta.name,
    {
      title: meta.title,
      description: meta.description,
      inputSchema,
      annotations: meta.annotations,
    },
    handler
  );
}
