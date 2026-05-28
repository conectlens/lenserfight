import { z } from 'zod';

/** Accepts any 8-4-4-4-12 hex UUID regardless of version/variant bits.
 *  Zod's built-in .uuid() enforces RFC 4122 variant/version which rejects
 *  synthetic seed IDs (e.g. 45000000-0001-0004-0001-000000000001). */
export const zUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'must be a valid UUID'
);

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

function wrap(payload: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

export function ok(data: unknown, tool: string, startMs: number): McpToolResult {
  return wrap({
    success: true,
    data,
    meta: {
      tool,
      timestamp: new Date().toISOString(),
      elapsed_ms: Date.now() - startMs,
    },
  });
}

export function fail(
  code: string,
  message: string,
  details: unknown,
  tool: string,
  startMs: number
): McpToolResult {
  return wrap({
    success: false,
    error: { code, message, details },
    meta: {
      tool,
      timestamp: new Date().toISOString(),
      elapsed_ms: Date.now() - startMs,
    },
  });
}

export function paginated<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
  tool: string,
  startMs: number
): McpToolResult {
  return ok(
    { items, total, limit, offset, has_more: offset + items.length < total },
    tool,
    startMs
  );
}
