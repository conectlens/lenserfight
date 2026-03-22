// ─── Provider Registry ────────────────────────────────────────────────────────

export type Provider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama' | 'fal';

// ─── Multimodal Content Parts ─────────────────────────────────────────────────
// ContentPart is the indirection layer between unified message format and
// provider-specific wire formats. Keeps provider adapters decoupled from callers.

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; mimeType?: string; detail?: 'low' | 'high' }
  | { type: 'document'; url: string; mimeType: string; name?: string }
  | { type: 'audio'; url: string; mimeType: string };

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  /** string = plain text (backward compat). ContentPart[] = multimodal. */
  content: string | ContentPart[];
}

// ─── Tool Calling ─────────────────────────────────────────────────────────────

export interface ToolSchema {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>; // JSON Schema
}

// ─── Request Options ──────────────────────────────────────────────────────────

export interface ProviderRequestOptions {
  maxTokens?: number;
  temperature?: number;
  tools?: ToolSchema[];
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface ProviderResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ImageResponse {
  urls: string[];
  units: number;
}

// ─── Adapter Contracts ────────────────────────────────────────────────────────

export interface ProviderAdapter {
  transformRequest: (
    model: string,
    messages: ProviderMessage[],
    options?: ProviderRequestOptions
  ) => { url: string; body: string; headers: Record<string, string> };
  transformResponse: (data: never) => ProviderResponse;
  authHeader: (apiKey: string) => Record<string, string>;
  buildUrl?: (model: string, apiKey: string) => string;
}

export interface StreamChunk {
  content?: string;
  usage?: { input_tokens: number; output_tokens: number };
  done: boolean;
}

export interface StreamingProviderAdapter {
  buildStreamRequest: (
    model: string,
    messages: ProviderMessage[],
    options?: ProviderRequestOptions
  ) => { url: string; body: string; headers: Record<string, string> };
  parseStreamChunk: (line: string, eventType?: string) => StreamChunk | null;
  authHeader: (apiKey: string) => Record<string, string>;
  buildStreamUrl?: (model: string, apiKey: string) => string;
}

// ─── SSE Events ───────────────────────────────────────────────────────────────

export interface SSEStartEvent {
  event: 'start';
  provider: string;
  model: string;
  run_id: string;
}

export interface SSETokenEvent {
  event: 'token';
  content: string;
}

export interface SSEEndEvent {
  event: 'end';
  usage: { input_tokens: number; output_tokens: number };
  credits_charged: number;
}

export interface SSEErrorEvent {
  event: 'error';
  message: string;
  code: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STREAM_MAX_OUTPUT_TOKENS = 8192;
export const STREAM_DEFAULT_MAX_TOKENS = 4096;
export const STREAM_TIMEOUT_MS = 60_000;
export const STREAM_MAX_BYTES = 1_048_576; // 1 MB

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Converts ContentPart[] to a plain text string (fallback for providers without vision). */
export function partsToText(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is ContentPart & { type: 'text' } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}

/** Returns true if any part in a message is non-text. */
export function hasMultimodalContent(messages: ProviderMessage[]): boolean {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type !== 'text')
  );
}
