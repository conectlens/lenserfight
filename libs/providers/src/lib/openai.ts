import type { ProviderMessage, ProviderRequestOptions, ProviderResponse, StreamChunk } from './types';
import { partsToText } from './types';

// ─── Wire Types ───────────────────────────────────────────────────────────────

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' } };

interface OpenAIMessage {
  role: string;
  content: string | OpenAIContentPart[];
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  stream_options?: { include_usage: boolean };
  tools?: unknown[];
}

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

// ─── Message Transformation ───────────────────────────────────────────────────

function toOpenAIMessage(msg: ProviderMessage): OpenAIMessage {
  if (typeof msg.content === 'string') {
    return { role: msg.role, content: msg.content };
  }

  const parts: OpenAIContentPart[] = msg.content.map((part) => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text };
    }
    if (part.type === 'image') {
      return {
        type: 'image_url',
        image_url: { url: part.url, ...(part.detail ? { detail: part.detail } : {}) },
      };
    }
    // Documents and audio: OpenAI requires file upload (not supported inline).
    // Fall back to text extraction with a note.
    return { type: 'text', text: `[Attachment: ${part.type} — inline not supported by this model]` };
  });

  return { role: msg.role, content: parts };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export function transformRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  const body: OpenAIRequest = {
    model,
    messages: messages.map(toOpenAIMessage),
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.tools?.length ? { tools: options.tools } : {}),
  };

  return {
    url: 'https://api.openai.com/v1/chat/completions',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

export function transformResponse(data: OpenAIResponse): ProviderResponse {
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
  const body: OpenAIRequest = {
    model,
    messages: messages.map(toOpenAIMessage),
    stream: true,
    stream_options: { include_usage: true },
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.tools?.length ? { tools: options.tools } : {}),
  };

  return {
    url: 'https://api.openai.com/v1/chat/completions',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

export function parseStreamChunk(line: string, _eventType?: string): StreamChunk | null {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
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

// Legacy compat: allow old callers that pass plain string messages
export { partsToText as _partsToText };
