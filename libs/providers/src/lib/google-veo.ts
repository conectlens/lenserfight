import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { AsyncGenerationResponse, GenerativeMediaAdapter, GenerativeMediaResponse } from './types';

// ─── Google Veo (Video) ──────────────────────────────────────────────────────
//
// Two transport paths, identical body shape:
//
//   AI Studio (default — `AIza…` API key only):
//     POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning
//     Header: x-goog-api-key: {API_KEY}
//   Poll:
//     GET  https://generativelanguage.googleapis.com/v1beta/{operationName}
//
//   Vertex AI (opt-in by setting params.project):
//     POST https://{region}-aiplatform.googleapis.com/v1/projects/{project}/.../models/{model}:predictLongRunning
//     Header: Authorization: Bearer {OAUTH_TOKEN}
//   Poll:
//     GET  https://{region}-aiplatform.googleapis.com/v1/{operationName}
//
// Refs: https://ai.google.dev/gemini-api/docs/video / Vertex AI Veo docs.

const PROVIDER = 'Google Veo';
const AI_STUDIO_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const VALID_ASPECTS = new Set(['16:9', '9:16']);
const VALID_DURATION = new Set([5, 6, 7, 8]);

interface VeoGenerateResponse {
  name?: string;
  error?: { message?: string };
}

interface VeoPollResponse {
  done?: boolean;
  error?: { message: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri: string; encoding?: string } }>;
    };
  };
}

function looksLikeAIStudioKey(apiKey: string): boolean {
  return /^AIza[a-zA-Z0-9_-]{20,}$/.test(apiKey);
}

/**
 * Operation names returned by Vertex include their full resource path
 * (`projects/.../locations/.../operations/<id>`). AI Studio operation names
 * start with `operations/`. The poll URL is whichever runtime issued the op.
 */
function pollUrlFor(opName: string, useVertex: boolean, region: string): string {
  if (useVertex) {
    return `https://${region}-aiplatform.googleapis.com/v1/${opName.replace(/^\/+/, '')}`;
  }
  return `${AI_STUDIO_BASE}/${opName.replace(/^\/+/, '')}`;
}

export const googleVeoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey): Record<string, string> {
    return looksLikeAIStudioKey(apiKey)
      ? { 'x-goog-api-key': apiKey }
      : { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Video generation requires a non-empty prompt.',
        provider: PROVIDER,
        model,
      });
    }
    const {
      duration_s = 8,
      aspect_ratio = '16:9',
      project = '',
      region = 'us-central1',
    } = params as { duration_s?: number; aspect_ratio?: string; project?: string; region?: string };

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

    const duration = VALID_DURATION.has(duration_s) ? duration_s : 8;
    const aspect = VALID_ASPECTS.has(aspect_ratio) ? aspect_ratio : '16:9';

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
          instances: [{ prompt }],
          parameters: { durationSeconds: duration, aspectRatio: aspect },
        }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const data = (await res.json()) as VeoGenerateResponse;
    if (data.error) {
      throw new ProviderError({
        code: 'server_error',
        message: data.error.message ?? 'Veo returned an error.',
        provider: PROVIDER,
        model,
      });
    }
    if (!data.name) {
      throw new ProviderError({
        code: 'server_error',
        message: 'Veo returned no operation name.',
        provider: PROVIDER,
        model,
      });
    }
    // Encode the transport mode + region in the providerTaskId so pollTask
    // can pick the right poll URL without the caller re-passing params.
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

    const data = (await res.json()) as VeoPollResponse;

    if (data.error) {
      return {
        status: 'failed',
        providerTaskId,
        message: `Veo failed: ${data.error.message}`,
      };
    }

    if (data.done) {
      const samples = data.response?.generateVideoResponse?.generatedSamples ?? [];
      const urls = samples.map((s) => s.video?.uri ?? '').filter(Boolean);
      if (urls.length === 0) {
        throw new ProviderError({
          code: 'content_policy',
          message: 'Veo returned no video samples — prompt may have been filtered.',
          provider: PROVIDER,
        });
      }
      return { status: 'completed', urls, mimeType: 'video/mp4' };
    }

    return { status: 'pending', providerTaskId };
  },
};
