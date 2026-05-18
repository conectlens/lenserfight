import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { AsyncGenerationResponse, GenerativeMediaAdapter, GenerativeMediaResponse } from './types';

// ─── Google Lyria (Music / Audio Generation) ─────────────────────────────────
// Same dual-path pattern as Imagen/Veo: defaults to AI Studio (just an
// `AIza…` API key); opt into Vertex by setting `params.project`. Both routes
// share the predictLongRunning + operations poll contract and emit
// `audioContent` (base64 mp3) on completion.

const PROVIDER = 'Google Lyria';
const AI_STUDIO_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface LyriaGenerateResponse {
  name?: string;
  error?: { message?: string };
}

interface LyriaPollResponse {
  done?: boolean;
  error?: { message: string };
  response?: {
    audioContent?: string;
  };
}

function looksLikeAIStudioKey(apiKey: string): boolean {
  return /^AIza[a-zA-Z0-9_-]{20,}$/.test(apiKey);
}

function pollUrlFor(opName: string, useVertex: boolean, region: string): string {
  if (useVertex) {
    return `https://${region}-aiplatform.googleapis.com/v1/${opName.replace(/^\/+/, '')}`;
  }
  return `${AI_STUDIO_BASE}/${opName.replace(/^\/+/, '')}`;
}

export const googleLyriaAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey): Record<string, string> {
    return looksLikeAIStudioKey(apiKey)
      ? { 'x-goog-api-key': apiKey }
      : { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Music generation requires a non-empty prompt.',
        provider: PROVIDER,
        model,
      });
    }
    const {
      duration_s = 30,
      project = '',
      region = 'us-central1',
    } = params as { duration_s?: number; project?: string; region?: string };

    const useVertex = Boolean(project);
    if (useVertex && looksLikeAIStudioKey(apiKey)) {
      throw new ProviderError({
        code: 'invalid_request',
        message:
          'You set a `project` (Vertex AI mode) but supplied an AI Studio API key. Drop `project` to use AI Studio, or pass a Google Cloud OAuth token.',
        provider: PROVIDER,
        model,
      });
    }

    const duration = Math.max(5, Math.min(120, Math.floor(duration_s)));
    const endpoint = useVertex
      ? `https://${region}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${region}/publishers/google/models/${encodeURIComponent(model)}:predictLongRunning`
      : `${AI_STUDIO_BASE}/models/${encodeURIComponent(model)}:predictLongRunning`;

    const headers: Record<string, string> = useVertex
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
      : { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };

    const res = await withTimeout(
      (signal) => fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [{ text: prompt }],
          parameters: { durationSeconds: duration },
        }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const data = (await res.json()) as LyriaGenerateResponse;
    if (data.error) {
      throw new ProviderError({
        code: 'server_error',
        message: data.error.message ?? 'Lyria returned an error.',
        provider: PROVIDER,
        model,
      });
    }
    if (!data.name) {
      throw new ProviderError({
        code: 'server_error',
        message: 'Lyria returned no operation name.',
        provider: PROVIDER,
        model,
      });
    }
    const tag = useVertex ? `vertex:${region}|` : 'ai-studio|';
    return { status: 'pending', providerTaskId: `${tag}${data.name}` };
  },

  async pollTask(apiKey, providerTaskId): Promise<GenerativeMediaResponse> {
    let opName = providerTaskId;
    let useVertex = false;
    let region = 'us-central1';
    if (providerTaskId.startsWith('vertex:')) {
      useVertex = true;
      const sep = providerTaskId.indexOf('|');
      region = providerTaskId.slice('vertex:'.length, sep);
      opName = providerTaskId.slice(sep + 1);
    } else if (providerTaskId.startsWith('ai-studio|')) {
      opName = providerTaskId.slice('ai-studio|'.length);
    }

    const headers: Record<string, string> = useVertex
      ? { Authorization: `Bearer ${apiKey}` }
      : { 'x-goog-api-key': apiKey };

    const res = await withTimeout(
      (signal) => fetch(pollUrlFor(opName, useVertex, region), { headers, signal }),
      { provider: PROVIDER, ms: 30_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER });
    }

    const data = (await res.json()) as LyriaPollResponse;

    if (data.error) {
      return {
        status: 'failed',
        providerTaskId,
        message: `Lyria failed: ${data.error.message}`,
      };
    }

    if (data.done && data.response?.audioContent) {
      const url = `data:audio/mpeg;base64,${data.response.audioContent}`;
      return { status: 'completed', urls: [url], mimeType: 'audio/mpeg' };
    }

    return { status: 'pending', providerTaskId };
  },
};
