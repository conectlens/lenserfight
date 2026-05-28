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
