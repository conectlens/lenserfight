import type { ProviderMessage, ProviderRequestOptions, ProviderResponse, StreamChunk } from './types';

// ─── Wire Types ───────────────────────────────────────────────────────────────

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };

interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiRequest {
  system_instruction?: { parts: Array<{ text: string }> };
  contents: GeminiMessage[];
  generationConfig?: { maxOutputTokens?: number; temperature?: number };
}

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
}

// ─── Message Transformation ───────────────────────────────────────────────────

function toGeminiParts(msg: ProviderMessage): GeminiPart[] {
  if (typeof msg.content === 'string') return [{ text: msg.content }];

  return msg.content.map((part): GeminiPart => {
    if (part.type === 'text') return { text: part.text };
    if (part.type === 'image') {
      // Gemini prefers fileData (URI) over inlineData for URLs
      return { fileData: { mimeType: part.mimeType ?? 'image/jpeg', fileUri: part.url } };
    }
    if (part.type === 'document') {
      return { fileData: { mimeType: part.mimeType, fileUri: part.url } };
    }
    if (part.type === 'audio') {
      return { fileData: { mimeType: part.mimeType, fileUri: part.url } };
    }
    return { text: '[Unknown content part]' };
  });
}

function buildGeminiBody(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions
): GeminiRequest {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const request: GeminiRequest = {
    contents: nonSystemMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: toGeminiParts(m),
    })),
    ...(systemMessages.length > 0
      ? {
          system_instruction: {
            parts: systemMessages.flatMap((m) =>
              typeof m.content === 'string'
                ? [{ text: m.content }]
                : m.content.filter((p) => p.type === 'text').map((p) => ({ text: (p as { text: string }).text }))
            ),
          },
        }
      : {}),
  };

  if (options.maxTokens || options.temperature !== undefined) {
    request.generationConfig = {
      ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    };
  }

  return request;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export function buildUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export function transformRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  return {
    url: model, // resolved via buildUrl at call time
    body: JSON.stringify(buildGeminiBody(model, messages, options)),
    headers: { 'Content-Type': 'application/json' },
  };
}

export function transformResponse(data: GeminiResponse): ProviderResponse {
  return {
    content: data.candidates[0]?.content?.parts?.[0]?.text ?? '',
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

export function authHeader(_apiKey: string): Record<string, string> {
  return {}; // Gemini: API key in query param via buildUrl
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export function buildStreamUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
}

export function buildStreamRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  return transformRequest(model, messages, options);
}

/** Google SSE: plain JSON chunks; stream ends when body closes (no [DONE]). */
export function parseStreamChunk(line: string, _eventType?: string): StreamChunk | null {
  const json = line.startsWith('data: ') ? line.slice(6).trim() : line.trim();
  if (!json || json === '[DONE]') return null;

  try {
    const parsed = JSON.parse(json);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const meta = parsed.usageMetadata;
    return {
      content: text || undefined,
      usage: meta
        ? { input_tokens: meta.promptTokenCount ?? 0, output_tokens: meta.candidatesTokenCount ?? 0 }
        : undefined,
      done: false,
    };
  } catch {
    return null;
  }
}
