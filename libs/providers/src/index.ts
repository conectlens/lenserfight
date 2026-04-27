// ─── Types & Contracts ────────────────────────────────────────────────────────
export type {
  Provider,
  GenerativeMediaProvider,
  ContentPart,
  ProviderMessage,
  ProviderRequestOptions,
  ToolSchema,
  ProviderResponse,
  ImageResponse,
  AsyncGenerationResponse,
  GenerativeMediaResult,
  GenerativeMediaResponse,
  GenerativeMediaAdapter,
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

// ─── Generative Media Adapters ────────────────────────────────────────────────
export { openaiImageAdapter } from './lib/openai-image';
export { openaiVideoAdapter } from './lib/openai-video';
export { googleImagenAdapter } from './lib/google-imagen';
export { googleVeoAdapter } from './lib/google-veo';
export { googleLyriaAdapter } from './lib/google-lyria';
export { stabilityAdapter } from './lib/stability';
export { elevenlabsAdapter } from './lib/elevenlabs';
export { klingAdapter } from './lib/kling';
export { sunoAdapter } from './lib/suno';

// ─── Ollama Constants ─────────────────────────────────────────────────────────
export { OLLAMA_DEFAULT_BASE_URL } from './lib/ollama';

// ─── Provider Registry ────────────────────────────────────────────────────────

import type { Provider, GenerativeMediaProvider, GenerativeMediaAdapter, GenerativeMediaResponse, ProviderAdapter, StreamingProviderAdapter, ProviderMessage, ProviderRequestOptions, ProviderResponse } from './lib/types';
import { openaiImageAdapter } from './lib/openai-image';
import { openaiVideoAdapter } from './lib/openai-video';
import { googleImagenAdapter } from './lib/google-imagen';
import { googleVeoAdapter } from './lib/google-veo';
import { googleLyriaAdapter } from './lib/google-lyria';
import { stabilityAdapter } from './lib/stability';
import { elevenlabsAdapter } from './lib/elevenlabs';
import { klingAdapter } from './lib/kling';
import { sunoAdapter } from './lib/suno';
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
  options?: ProviderRequestOptions,
  signal?: AbortSignal
): Promise<ProviderResponse> {
  const adapter = getAdapter(provider);
  const { url: baseUrl, body, headers } = adapter.transformRequest(model, messages, options);
  const finalUrl = adapter.buildUrl ? adapter.buildUrl(model, apiKey) : baseUrl;

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { ...headers, ...adapter.authHeader(apiKey) },
    body,
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider ${provider} error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return adapter.transformResponse(data as never);
}

// ─── Generative Media Registry ────────────────────────────────────────────────

type ImageProvider = Extract<GenerativeMediaProvider, 'openai' | 'google' | 'stability' | 'fal' | 'midjourney'>;
type VideoProvider = Extract<GenerativeMediaProvider, 'openai' | 'google' | 'kling'>;
type AudioProvider = Extract<GenerativeMediaProvider, 'google' | 'elevenlabs' | 'suno'>;

const GENERATIVE_ADAPTERS: Partial<Record<GenerativeMediaProvider, GenerativeMediaAdapter>> = {
  openai: openaiImageAdapter as GenerativeMediaAdapter, // default: image; override per modality below
  google: googleImagenAdapter as GenerativeMediaAdapter,
  stability: stabilityAdapter,
  elevenlabs: elevenlabsAdapter,
  kling: klingAdapter,
  suno: sunoAdapter,
};

const VIDEO_ADAPTERS: Partial<Record<VideoProvider, GenerativeMediaAdapter>> = {
  openai: openaiVideoAdapter,
  google: googleVeoAdapter,
  kling: klingAdapter,
};

const AUDIO_ADAPTERS: Partial<Record<AudioProvider, GenerativeMediaAdapter>> = {
  google: googleLyriaAdapter,
  elevenlabs: elevenlabsAdapter,
  suno: sunoAdapter,
};

/**
 * Dispatch a generative media request to the appropriate adapter.
 * Returns synchronously for image providers; async video/audio providers return
 * { status: 'pending', taskId } — callers must poll via getGenerativeAdapter().pollTask().
 */
export async function callGenerativeMedia(
  provider: GenerativeMediaProvider,
  modality: 'image' | 'video' | 'audio' | 'music',
  apiKey: string,
  model: string,
  prompt: string,
  params?: Record<string, unknown>
): Promise<GenerativeMediaResponse> {
  let adapter: GenerativeMediaAdapter | undefined;

  if (modality === 'video') {
    adapter = VIDEO_ADAPTERS[provider as VideoProvider];
  } else if (modality === 'audio' || modality === 'music') {
    adapter = AUDIO_ADAPTERS[provider as AudioProvider];
  } else {
    adapter = GENERATIVE_ADAPTERS[provider];
  }

  if (!adapter) {
    throw new Error(`No generative ${modality} adapter for provider: ${provider}`);
  }

  return adapter.generate(apiKey, model, prompt, params);
}

/** Retrieve the adapter for a provider so callers can poll async tasks. */
export function getGenerativeAdapter(
  provider: GenerativeMediaProvider,
  modality: 'image' | 'video' | 'audio' | 'music'
): GenerativeMediaAdapter {
  let adapter: GenerativeMediaAdapter | undefined;

  if (modality === 'video') {
    adapter = VIDEO_ADAPTERS[provider as VideoProvider];
  } else if (modality === 'audio' || modality === 'music') {
    adapter = AUDIO_ADAPTERS[provider as AudioProvider];
  } else {
    adapter = GENERATIVE_ADAPTERS[provider];
  }

  if (!adapter) throw new Error(`No generative ${modality} adapter for provider: ${provider}`);
  return adapter;
}
