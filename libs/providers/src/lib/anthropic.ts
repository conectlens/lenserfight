import type { ProviderMessage, ProviderRequestOptions, ProviderResponse, StreamChunk } from './types';

// ─── Wire Types ───────────────────────────────────────────────────────────────

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'url'; url: string; media_type?: string } }
  | { type: 'document'; source: { type: 'url'; url: string; media_type: string } };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  system?: string;
  stream?: boolean;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

// ─── Message Transformation ───────────────────────────────────────────────────

function toAnthropicMessage(msg: ProviderMessage): AnthropicMessage | null {
  if (msg.role === 'system') return null; // handled as top-level `system` field

  if (typeof msg.content === 'string') {
    return { role: msg.role as 'user' | 'assistant', content: msg.content };
  }

  const blocks: AnthropicContentBlock[] = msg.content.map((part) => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text };
    }
    if (part.type === 'image') {
      return {
        type: 'image',
        source: { type: 'url', url: part.url, ...(part.mimeType ? { media_type: part.mimeType } : {}) },
      };
    }
    if (part.type === 'document') {
      return {
        type: 'document',
        source: { type: 'url', url: part.url, media_type: part.mimeType },
      };
    }
    // Audio: not supported by Claude; fall back to text note
    return { type: 'text', text: `[Attachment: audio — not supported by this model]` };
  });

  return { role: msg.role as 'user' | 'assistant', content: blocks };
}

function buildAnthropicBody(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions,
  stream?: boolean
): AnthropicRequest {
  const systemMsg = messages.find((m) => m.role === 'system');
  const systemText = systemMsg
    ? typeof systemMsg.content === 'string'
      ? systemMsg.content
      : systemMsg.content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n')
    : undefined;

  const anthropicMessages = messages
    .map(toAnthropicMessage)
    .filter((m): m is AnthropicMessage => m !== null);

  return {
    model,
    messages: anthropicMessages,
    max_tokens: options.maxTokens ?? 4096,
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(systemText ? { system: systemText } : {}),
    ...(stream ? { stream: true } : {}),
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'anthropic-version': '2023-06-01',
};

export function transformRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  return {
    url: 'https://api.anthropic.com/v1/messages',
    body: JSON.stringify(buildAnthropicBody(model, messages, options)),
    headers: HEADERS,
  };
}

export function transformResponse(data: AnthropicResponse): ProviderResponse {
  const textBlock = data.content.find((b) => b.type === 'text');
  return {
    content: textBlock?.text ?? '',
    usage: { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens },
  };
}

export function authHeader(apiKey: string): Record<string, string> {
  return { 'x-api-key': apiKey };
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export function buildStreamRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  return {
    url: 'https://api.anthropic.com/v1/messages',
    body: JSON.stringify(buildAnthropicBody(model, messages, options, true)),
    headers: HEADERS,
  };
}

/**
 * Anthropic SSE interleaves "event:" and "data:" lines.
 * The pump loop tracks the last event type and passes it as eventType.
 */
export function parseStreamChunk(line: string, eventType?: string): StreamChunk | null {
  const json = line.startsWith('data: ') ? line.slice(6).trim() : line.trim();
  if (!json || json === '[DONE]') return null;

  try {
    const parsed = JSON.parse(json);

    switch (eventType) {
      case 'message_start':
        return { usage: { input_tokens: parsed.message?.usage?.input_tokens ?? 0, output_tokens: 0 }, done: false };
      case 'content_block_delta':
        return { content: parsed.delta?.text || undefined, done: false };
      case 'message_delta':
        return { usage: { input_tokens: 0, output_tokens: parsed.usage?.output_tokens ?? 0 }, done: false };
      case 'message_stop':
        return { done: true };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
