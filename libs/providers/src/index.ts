import * as anthropic from './lib/anthropic';
import { elevenlabsAdapter } from './lib/elevenlabs';
import { falStableVideoAdapter } from './lib/fal-stable-video';
import * as google from './lib/google';
import { googleImagenAdapter } from './lib/google-imagen';
import { googleLyriaAdapter } from './lib/google-lyria';
import { googleVeoAdapter } from './lib/google-veo';
import { klingAdapter } from './lib/kling';
import { klingI2vAdapter } from './lib/kling-i2v';
import * as mistral from './lib/mistral';
import * as ollama from './lib/ollama';
import * as openai from './lib/openai';
import { openaiImageAdapter } from './lib/openai-image';
import { openaiVideoAdapter } from './lib/openai-video';
import { stabilityAdapter } from './lib/stability';
import { sunoAdapter } from './lib/suno';

import type {
  Provider,
  GenerativeMediaProvider,
  GenerativeMediaAdapter,
  GenerativeMediaResponse,
  ProviderAdapter,
  StreamingProviderAdapter,
  ProviderMessage,
  ProviderRequestOptions,
  ProviderResponse,
} from './lib/types';

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
// AP: Image-to-video adapters
export { klingI2vAdapter } from './lib/kling-i2v';
export { falStableVideoAdapter } from './lib/fal-stable-video';

// ─── Ollama Constants ─────────────────────────────────────────────────────────
export { OLLAMA_DEFAULT_BASE_URL } from './lib/ollama';

// ─── Provider Registry ────────────────────────────────────────────────────────

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

type VideoProvider = Extract<GenerativeMediaProvider, 'openai' | 'google' | 'kling'>;
type AudioProvider = Extract<GenerativeMediaProvider, 'google' | 'elevenlabs' | 'suno'>;

const GENERATIVE_ADAPTERS: Partial<Record<GenerativeMediaProvider, GenerativeMediaAdapter>> = {
  openai: openaiImageAdapter as GenerativeMediaAdapter,
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

// AP: Image-to-video adapters keyed by provider
export const IMAGE_TO_VIDEO_ADAPTERS: Partial<Record<GenerativeMediaProvider, GenerativeMediaAdapter>> = {
  kling: klingI2vAdapter,
  fal: falStableVideoAdapter,
};

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
