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
import { mapHttpError, ProviderError } from './lib/provider-errors';
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
  FailedGenerationResponse,
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

// ─── Model Registry (canonical LF keys → real provider keys) ─────────────────
export type { ModelDescriptor, AnyProvider } from './lib/model-registry';
export {
  lookupModel,
  detectProvider,
  resolveWireModel,
  modelKind,
  listModels,
} from './lib/model-registry';

// ─── Media Capabilities (UI-facing — drives form gating) ─────────────────────
export type { MediaCapabilities } from './lib/media-capabilities';
export { getMediaCapabilities } from './lib/media-capabilities';

// ─── Capability Matrix (test parametrization SoT) ─────────────────────────────
export type {
  ExecutionPath,
  FundingSource,
  ProviderSupportLevel,
  ExpectedOutcome,
  ExecutionPattern,
  CapabilityMatrixEntry,
} from './lib/capability-matrix';
export {
  PROVIDER_SUPPORT_LEVEL,
  LOCAL_PROVIDERS,
  CHAINABIT_GATEWAY_PROVIDERS,
  buildCapabilityMatrix,
} from './lib/capability-matrix';

// ─── Provider Errors (normalised codes, retry/timeout helpers) ───────────────
export type {
  ProviderErrorCode,
  ProviderErrorOptions,
  RetryOptions,
  TimeoutOptions,
} from './lib/provider-errors';
export {
  ProviderError,
  mapHttpError,
  withTimeout,
  withRetry,
} from './lib/provider-errors';

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
    throw await mapHttpError(response, { provider, model });
  }
  if (!response.body) {
    throw new ProviderError({
      code: 'server_error',
      message: `${provider} returned an empty stream body.`,
      provider,
      model,
    });
  }

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
    throw await mapHttpError(response, { provider, model });
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

import { lookupModel as _lookupModel, resolveWireModel as _resolveWireModel } from './lib/model-registry';
import { ProviderError as _ProviderError } from './lib/provider-errors';

/**
 * Dispatch a generative-media request to the right adapter.
 *
 * Pre-flight gates (no HTTP, no credit burn):
 *  1. The model must be registered.
 *  2. The model's declared `kind` must match the requested modality
 *     (`music` accepts `audio`-kinded models).
 *  3. The dispatched adapter must exist for the modality.
 *
 * On success the adapter receives the **wire model name** (real provider id),
 * not the LenserFight canonical key.
 *
 * `provider` is allowed to be `null` — when null we resolve from the registry.
 * Callers that already know the provider (e.g. byok-key-resolver) can pass it
 * to keep one decision point.
 */
export async function callGenerativeMedia(
  provider: GenerativeMediaProvider | null,
  modality: 'image' | 'video' | 'audio' | 'music',
  apiKey: string,
  model: string,
  prompt: string,
  params?: Record<string, unknown>
): Promise<GenerativeMediaResponse> {
  const descriptor = _lookupModel(model);
  if (!descriptor) {
    throw new _ProviderError({
      code: 'unsupported_model',
      message: `Model "${model}" is not registered. Update the model registry or pick a supported model.`,
      provider: provider ?? 'unknown',
      model,
    });
  }

  const expectedKind = modality === 'music' ? ['music', 'audio'] : [modality];
  if (!expectedKind.includes(descriptor.kind)) {
    throw new _ProviderError({
      code: 'unsupported_model',
      message: `Model "${model}" produces ${descriptor.kind}, not ${modality}. Pick a ${modality}-capable model.`,
      provider: descriptor.provider,
      model,
    });
  }

  const resolvedProvider = (provider ?? descriptor.provider) as GenerativeMediaProvider;
  if (resolvedProvider !== descriptor.provider) {
    // Caller supplied a provider that conflicts with the registry — refuse
    // rather than silently miss-route.
    throw new _ProviderError({
      code: 'unsupported_model',
      message: `Model "${model}" belongs to provider "${descriptor.provider}", not "${resolvedProvider}".`,
      provider: descriptor.provider,
      model,
    });
  }

  let adapter: GenerativeMediaAdapter | undefined;
  if (modality === 'video') {
    adapter = VIDEO_ADAPTERS[resolvedProvider as VideoProvider];
  } else if (modality === 'audio' || modality === 'music') {
    adapter = AUDIO_ADAPTERS[resolvedProvider as AudioProvider];
  } else {
    adapter = GENERATIVE_ADAPTERS[resolvedProvider];
  }

  if (!adapter) {
    throw new _ProviderError({
      code: 'unsupported_model',
      message: `No ${modality} adapter is registered for provider "${resolvedProvider}".`,
      provider: resolvedProvider,
      model,
    });
  }

  const wireModel = _resolveWireModel(model);
  return adapter.generate(apiKey, wireModel, prompt, params);
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
