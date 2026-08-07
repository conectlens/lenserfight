import {
  toGeminiParts,
  buildGeminiBody,
  transformResponse as transformGeminiResponse,
  parseStreamChunk as parseGeminiStreamChunk,
} from './google';

import type { ProviderMessage, ProviderRequestOptions, StreamChunk } from './types';

// Vertex AI "Express Mode" — the same Gemini generateContent wire format as
// the Gemini Developer API, but served from the Vertex publisher-model path
// and authenticated with a Vertex-issued API key. No GCP project id is
// required on this path (Express Mode resolves it from the key itself).
const VERTEX_BASE_URL = 'https://aiplatform.googleapis.com/v1/publishers/google/models';

export function buildUrl(model: string, _apiKey: string): string {
  // SECURITY: API key is sent via x-goog-api-key header (authHeader below),
  // NOT as a query parameter — same rationale as the Gemini Developer API adapter.
  return `${VERTEX_BASE_URL}/${model}:generateContent`;
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

export const transformResponse = transformGeminiResponse;

export function authHeader(apiKey: string): Record<string, string> {
  return { 'x-goog-api-key': apiKey };
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export function buildStreamUrl(model: string, _apiKey: string): string {
  return `${VERTEX_BASE_URL}/${model}:streamGenerateContent?alt=sse`;
}

export function buildStreamRequest(
  model: string,
  messages: ProviderMessage[],
  options: ProviderRequestOptions = {}
): { url: string; body: string; headers: Record<string, string> } {
  return transformRequest(model, messages, options);
}

/** Wire format is identical to the Gemini Developer API SSE stream. */
export const parseStreamChunk: (line: string, eventType?: string) => StreamChunk | null =
  parseGeminiStreamChunk;

// Re-exported so callers that want to build a custom request body (e.g. the
// Deno edge functions, which can't import this lib) have a documented shape
// to mirror. Not used internally beyond transformRequest above.
export { toGeminiParts };
