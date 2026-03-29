import type { ProviderMessage, ProviderRequestOptions, ProviderResponse, StreamChunk } from './types';

// ─── Ollama Adapter ───────────────────────────────────────────────────────────
// Ollama REST API: http://localhost:11434/api/chat
// - No auth header required (local inference)
// - Images passed as base64 strings in a sibling `images` array on the message
// - Streaming: NDJSON (one JSON object per line, not SSE format)
// - Base URL is configurable for non-standard local setups

const DEFAULT_BASE_URL = 'http://localhost:11434';

// ─── Wire Types ───────────────────────────────────────────────────────────────

interface OllamaMessage {
  role: string;
  content: string;
  images?: string[]; // base64-encoded, no data URI prefix
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: { num_predict?: number; temperature?: number };
}

interface OllamaResponse {
  message: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fetches a URL and returns its content as a base64 string (for image parts). */
async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toOllamaMessage(msg: ProviderMessage): OllamaMessage {
  if (typeof msg.content === 'string') {
    return { role: msg.role, content: msg.content };
  }

  const textParts = msg.content
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('\n');

  // Images are passed as base64 via the images[] sibling field.
  // URLs require async fetch; for sync transformRequest we include a placeholder.
  // Use buildStreamRequest (async capable) for multimodal use.
  const imageParts = msg.content
    .filter((p): p is Extract<typeof p, { type: 'image' }> => p.type === 'image');

  return {
    role: msg.role,
    content: textParts || '.',
    ...(imageParts.length > 0
      ? { images: imageParts.map((p) => p.url) } // Note: URLs; caller must base64-encode if needed
      : {}),
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export function transformRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {},
  baseUrl?: string
): { url: string; body: string; headers: Record<string, string> } {
  const body: OllamaRequest = {
    model,
    messages: messages.map(toOllamaMessage),
    stream: false,
    ...(options.maxTokens || options.temperature !== undefined
      ? {
          options: {
            ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          },
        }
      : {}),
  };

  return {
    url: `${baseUrl ?? DEFAULT_BASE_URL}/api/chat`,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

export function transformResponse(data: OllamaResponse): ProviderResponse {
  return {
    content: data.message?.content ?? '',
    usage: {
      input_tokens: data.prompt_eval_count ?? 0,
      output_tokens: data.eval_count ?? 0,
    },
  };
}

/** Ollama: no auth for local inference; Bearer token required for cloud models. */
export function authHeader(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export function buildStreamRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {},
  baseUrl?: string
): { url: string; body: string; headers: Record<string, string> } {
  const body: OllamaRequest = {
    model,
    messages: messages.map(toOllamaMessage),
    stream: true,
    ...(options.maxTokens || options.temperature !== undefined
      ? {
          options: {
            ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          },
        }
      : {}),
  };

  return {
    url: `${baseUrl ?? DEFAULT_BASE_URL}/api/chat`,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Ollama streaming: NDJSON, not SSE.
 * Each line is a complete JSON object (no "data: " prefix).
 * `done: true` on the final line signals end of stream.
 */
export function parseStreamChunk(line: string, _eventType?: string): StreamChunk | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed: OllamaResponse = JSON.parse(trimmed);
    if (parsed.done) {
      return {
        done: true,
        usage: {
          input_tokens: parsed.prompt_eval_count ?? 0,
          output_tokens: parsed.eval_count ?? 0,
        },
      };
    }
    return {
      content: parsed.message?.content || undefined,
      done: false,
    };
  } catch {
    return null;
  }
}

export { DEFAULT_BASE_URL as OLLAMA_DEFAULT_BASE_URL };
