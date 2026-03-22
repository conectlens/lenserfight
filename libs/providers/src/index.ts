// ─── Types & Contracts ────────────────────────────────────────────────────────
export type {
  Provider,
  ContentPart,
  ProviderMessage,
  ProviderRequestOptions,
  ToolSchema,
  ProviderResponse,
  ImageResponse,
  ProviderAdapter,
  StreamingProviderAdapter,
  StreamChunk,
  SSEStartEvent,
  SSETokenEvent,
  SSEEndEvent,
  SSEErrorEvent,
} from './lib/types';

export {
  STREAM_MAX_OUTPUT_TOKENS,
  STREAM_DEFAULT_MAX_TOKENS,
  STREAM_TIMEOUT_MS,
  STREAM_MAX_BYTES,
  partsToText,
  hasMultimodalContent,
} from './lib/types';

// ─── Capability Mapper ────────────────────────────────────────────────────────
export type { ModelCapabilities, ValidationError } from './lib/capability-mapper';
export { CapabilityMapper, capabilityMapper } from './lib/capability-mapper';

// ─── BYOK Key Resolver ────────────────────────────────────────────────────────
export type { BYOKKeyResolverOptions } from './lib/byok-key-resolver';
export { BYOKKeyResolver, byokKeyResolver } from './lib/byok-key-resolver';

// ─── FAL (Image Generation) ───────────────────────────────────────────────────
export { callFal } from './lib/fal';

// ─── Ollama Constants ─────────────────────────────────────────────────────────
export { OLLAMA_DEFAULT_BASE_URL } from './lib/ollama';

// ─── Provider Registry ────────────────────────────────────────────────────────

import type { Provider, ProviderAdapter, StreamingProviderAdapter, ProviderMessage, ProviderRequestOptions, ProviderResponse } from './lib/types';
import * as openai from './lib/openai';
import * as anthropic from './lib/anthropic';
import * as google from './lib/google';
import * as mistral from './lib/mistral';
import * as ollama from './lib/ollama';

type TextProvider = Exclude<Provider, 'fal'>;

const ADAPTERS: Record<TextProvider, ProviderAdapter> = {
  openai: openai as unknown as ProviderAdapter,
  anthropic: anthropic as unknown as ProviderAdapter,
  google: google as unknown as ProviderAdapter,
  mistral: mistral as unknown as ProviderAdapter,
  ollama: ollama as unknown as ProviderAdapter,
};

const STREAM_ADAPTERS: Record<TextProvider, StreamingProviderAdapter> = {
  openai: openai as unknown as StreamingProviderAdapter,
  anthropic: anthropic as unknown as StreamingProviderAdapter,
  google: google as unknown as StreamingProviderAdapter,
  mistral: mistral as unknown as StreamingProviderAdapter,
  ollama: ollama as unknown as StreamingProviderAdapter,
};

export function getAdapter(provider: TextProvider): ProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unsupported provider: ${provider}`);
  return adapter;
}

export function getStreamAdapter(provider: TextProvider): StreamingProviderAdapter {
  const adapter = STREAM_ADAPTERS[provider];
  if (!adapter) throw new Error(`Unsupported streaming provider: ${provider}`);
  return adapter;
}

export async function streamProvider(
  provider: TextProvider,
  apiKey: string,
  model: string,
  messages: ProviderMessage[],
  options?: ProviderRequestOptions,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const adapter = getStreamAdapter(provider);
  const { url: baseUrl, body, headers } = adapter.buildStreamRequest(model, messages, options);
  const finalUrl = adapter.buildStreamUrl ? adapter.buildStreamUrl(model, apiKey) : baseUrl;

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { ...headers, ...adapter.authHeader(apiKey) },
    body,
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider ${provider} stream error: ${response.status} ${text}`);
  }
  if (!response.body) throw new Error(`Provider ${provider} returned empty stream body`);

  return response.body;
}

export async function callProvider(
  provider: TextProvider,
  apiKey: string,
  model: string,
  messages: ProviderMessage[],
  options?: ProviderRequestOptions
): Promise<ProviderResponse> {
  const adapter = getAdapter(provider);
  const { url: baseUrl, body, headers } = adapter.transformRequest(model, messages, options);
  const finalUrl = adapter.buildUrl ? adapter.buildUrl(model, apiKey) : baseUrl;

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { ...headers, ...adapter.authHeader(apiKey) },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider ${provider} error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return adapter.transformResponse(data as never);
}
