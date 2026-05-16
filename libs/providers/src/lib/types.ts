// ─── Provider Registry ────────────────────────────────────────────────────────

export type Provider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama' | 'fal';

export type GenerativeMediaProvider =
  | 'openai'      // DALL-E (image), Sora (video)
  | 'google'      // Imagen (image), Veo (video), Lyria (audio)
  | 'stability'   // Stable Diffusion (image)
  | 'elevenlabs'  // TTS / voice cloning (audio)
  | 'kling'       // Video generation
  | 'suno'        // Music generation
  | 'midjourney'  // Image generation
  | 'fal';        // Flux (image)

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

/**
 * Returned immediately by async providers (video, long audio).
 *
 * The `providerTaskId` field is opaque to LenserFight — pass it back verbatim
 * to `pollTask(apiKey, providerTaskId)` on the same adapter to fetch status.
 * (Historic alias `taskId` was renamed for clarity; nothing else read it.)
 */
export interface AsyncGenerationResponse {
  status: 'pending';
  providerTaskId: string;
  /** Estimated seconds until completion, if the provider provides it. */
  estimatedSeconds?: number;
}

/** Returned when generation is complete (sync image or polled async result). */
export interface GenerativeMediaResult {
  status: 'completed';
  /** Public or signed URL(s) of the generated media. */
  urls: string[];
  mimeType: string;
  /** Width in pixels (images only). */
  width?: number;
  /** Height in pixels (images only). */
  height?: number;
  /** Duration in seconds (video / audio). */
  durationSeconds?: number;
}

/**
 * Returned by `pollTask` when the provider has marked the task failed but the
 * caller should not see a thrown exception (poll loops want structured results).
 * Adapters still throw a `ProviderError` from `generate()` for synchronous
 * failures (auth, rate-limit, content-policy).
 */
export interface FailedGenerationResponse {
  status: 'failed';
  providerTaskId?: string;
  /** Provider-side message, already sanitised by the adapter. */
  message: string;
}

export type GenerativeMediaResponse =
  | AsyncGenerationResponse
  | GenerativeMediaResult
  | FailedGenerationResponse;

/**
 * Adapter for generative media providers (image / video / audio / music).
 * Sync providers (image) return GenerativeMediaResult directly.
 * Async providers (video / audio) return AsyncGenerationResponse; callers
 * must poll via pollTask() until status = 'completed'.
 */
export interface GenerativeMediaAdapter {
  /** Submit a generation request. */
  generate(
    apiKey: string,
    model: string,
    prompt: string,
    params?: Record<string, unknown>
  ): Promise<GenerativeMediaResponse>;

  /** Poll a previously submitted async task. Only required for async providers. */
  pollTask?(
    apiKey: string,
    providerTaskId: string
  ): Promise<GenerativeMediaResponse>;

  /** Auth header builder (used by callGenerativeMedia registry). */
  authHeader(apiKey: string): Record<string, string>;
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
