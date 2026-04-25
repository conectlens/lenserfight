import type { ProviderMessage, ProviderRequestOptions, ProviderResponse, StreamChunk } from './types';
import { partsToText } from './types';

// ─── Wire Types ───────────────────────────────────────────────────────────────
// Mistral's chat completions API is OpenAI-compatible.
// Image input: content array with { type: 'image_url', image_url: { url } }

type MistralContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface MistralMessage {
  role: string;
  content: string | MistralContentPart[];
}

interface MistralRequest {
  model: string;
  messages: MistralMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: unknown[];
}

interface MistralResponse {
  choices: Array<{ message: { content: string } }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

// ─── Message Transformation ───────────────────────────────────────────────────

function toMistralMessage(msg: ProviderMessage): MistralMessage {
  if (typeof msg.content === 'string') {
    return { role: msg.role, content: msg.content };
  }

  const parts: MistralContentPart[] = msg.content.map((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    if (part.type === 'image') return { type: 'image_url', image_url: { url: part.url } };
    // Documents: Mistral supports OCR-compatible text extraction; fallback to text
    if (part.type === 'document') return { type: 'text', text: `[Document: ${part.url}]` };
    return { type: 'text', text: `[Attachment: ${part.type} — not supported]` };
  });

  return { role: msg.role, content: parts };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export function transformRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  const body: MistralRequest = {
    model,
    messages: messages.map(toMistralMessage),
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.tools?.length ? { tools: options.tools } : {}),
  };

  return {
    url: 'https://api.mistral.ai/v1/chat/completions',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

export function transformResponse(data: MistralResponse): ProviderResponse {
  return {
    content: data.choices[0]?.message?.content ?? '',
    usage: {
      input_tokens: data.usage.prompt_tokens,
      output_tokens: data.usage.completion_tokens,
    },
  };
}

export function authHeader(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export function buildStreamRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  const body: MistralRequest = {
    model,
    messages: messages.map(toMistralMessage),
    stream: true,
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
  };

  return {
    url: 'https://api.mistral.ai/v1/chat/completions',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

/** Mistral SSE: same format as OpenAI (data: JSON, [DONE] sentinel). */
export function parseStreamChunk(line: string, _eventType?: string): StreamChunk | null {
  const data = line.startsWith('data: ') ? line.slice(6).trim() : line.trim();
  if (!data) return null;
  if (data === '[DONE]') return { done: true };

  try {
    const parsed = JSON.parse(data);
    const delta = parsed.choices?.[0]?.delta;
    const usage = parsed.usage;
    return {
      content: delta?.content ?? undefined,
      usage: usage
        ? { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens }
        : undefined,
      done: false,
    };
  } catch {
    return null;
  }
}

export { partsToText as _partsToText };
