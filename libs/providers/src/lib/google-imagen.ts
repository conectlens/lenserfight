import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── Google Imagen (Image Generation) ────────────────────────────────────────
//
// Two transport paths — same wire body, different URL and auth:
//
//   AI Studio (default — just needs an `AIza…` API key):
//     POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predict
//     Header: x-goog-api-key: {API_KEY}
//
//   Vertex AI (opt-in by setting params.project):
//     POST https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:predict
//     Header: Authorization: Bearer {OAUTH_TOKEN}
//
// Refs:
//   https://ai.google.dev/gemini-api/docs/imagen
//   https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
//
// The error "Vertex AI requires a project parameter" only fires now if the
// caller explicitly opted into Vertex but forgot a project. AI Studio is the
// default and never requires a project.

const PROVIDER = 'Google Imagen';

const AI_STUDIO_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const VALID_ASPECTS = new Set(['1:1', '9:16', '16:9', '4:3', '3:4']);
const VALID_PERSON_GEN = new Set(['dont_allow', 'allow_adult']);
const VALID_SAFETY = new Set(['block_most', 'block_some', 'block_few']);

interface ImagenResponse {
  predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>;
  /** Gemini API returns errors as `{ error: { code, message, status } }`. */
  error?: { code?: number; message?: string; status?: string };
}

interface ImagenParams {
  n?: number;
  aspect_ratio?: string;
  negative_prompt?: string;
  /** Provide to route via Vertex AI; absent = AI Studio (Gemini API). */
  project?: string;
  region?: string;
  person_generation?: string;
  safety_filter_level?: string;
}

/**
 * Heuristic — AI Studio API keys are the 39-character `AIza…` form. If the
 * caller passes something that looks like a Vertex OAuth token (typically
 * `ya29.…` or a JWT) but doesn't set `project`, surface a clearer message.
 */
function looksLikeAIStudioKey(apiKey: string): boolean {
  return /^AIza[a-zA-Z0-9_-]{20,}$/.test(apiKey);
}

export const googleImagenAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey): Record<string, string> {
    // Default header — Vertex path overrides this below via Authorization.
    return looksLikeAIStudioKey(apiKey)
      ? { 'x-goog-api-key': apiKey }
      : { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Image generation requires a non-empty prompt.',
        provider: PROVIDER,
        model,
      });
    }
    const {
      n: rawN = 1,
      aspect_ratio = '1:1',
      negative_prompt,
      project = '',
      region = 'us-central1',
      person_generation,
      safety_filter_level,
    } = params as ImagenParams;

    const sampleCount = Math.max(1, Math.min(4, Math.floor(rawN || 1)));
    const aspect = VALID_ASPECTS.has(aspect_ratio) ? aspect_ratio : '1:1';

    const parameters: Record<string, unknown> = { sampleCount, aspectRatio: aspect };
    if (person_generation && VALID_PERSON_GEN.has(person_generation)) {
      parameters.personGeneration = person_generation;
    }
    if (safety_filter_level && VALID_SAFETY.has(safety_filter_level)) {
      parameters.safetyFilterLevel = safety_filter_level;
    }

    // Route selection: explicit project → Vertex; otherwise → AI Studio.
    const useVertex = Boolean(project);

    let endpoint: string;
    let headers: Record<string, string>;
    if (useVertex) {
      if (!looksLikeAIStudioKey(apiKey)) {
        // Treat as OAuth Bearer token (most Vertex auth scenarios).
        headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };
      } else {
        // Edge case — caller set project AND passed an AIza key. AI Studio keys
        // don't authenticate against Vertex; emit an explicit error so the
        // caller can either drop `project` or supply an OAuth token.
        throw new ProviderError({
          code: 'invalid_request',
          message:
            'You set a `project` (Vertex AI mode) but supplied an AI Studio API key (AIza…). Either remove `project` to use the AI Studio path, or supply a Google Cloud OAuth token.',
          provider: PROVIDER,
          model,
        });
      }
      endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${region}/publishers/google/models/${encodeURIComponent(model)}:predict`;
    } else {
      // AI Studio (Gemini API). API key only — no project, no OAuth, no region.
      headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      };
      endpoint = `${AI_STUDIO_BASE}/models/${encodeURIComponent(model)}:predict`;
    }

    const res = await withTimeout(
      (signal) => fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [{
            prompt,
            ...(negative_prompt ? { negativePrompt: negative_prompt } : {}),
          }],
          parameters,
        }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 90_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, {
        provider: PROVIDER,
        model,
        notFoundMessage:
          useVertex
            ? `Vertex AI could not find model "${model}" in project "${project}". Check the model id and your project enables Vertex AI.`
            : `Google AI Studio could not find model "${model}". Confirm it's in the public model list.`,
      });
    }

    const data = (await res.json()) as ImagenResponse;

    if (data.error) {
      throw new ProviderError({
        code: 'server_error',
        message: data.error.message ?? 'Imagen returned an error.',
        provider: PROVIDER,
        model,
        providerCode: data.error.status,
      });
    }

    const predictions = data.predictions ?? [];
    if (predictions.length === 0) {
      throw new ProviderError({
        code: 'content_policy',
        message: 'Imagen returned no images — the prompt may have been filtered.',
        provider: PROVIDER,
        model,
      });
    }

    const urls = predictions.map((p) => `data:${p.mimeType};base64,${p.bytesBase64Encoded}`);
    return { status: 'completed', urls, mimeType: predictions[0].mimeType };
  },
};
