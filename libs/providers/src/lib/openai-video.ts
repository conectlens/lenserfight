import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { AsyncGenerationResponse, GenerativeMediaAdapter, GenerativeMediaResponse } from './types';

// ─── OpenAI Video (Sora) ─────────────────────────────────────────────────────
// Async pattern: POST /v1/video/generations → task. GET /v1/video/generations/:id → status.
// Verified shape: response carries `id`, `status` ('queued'|'in_progress'|'completed'|'failed'),
// and (on completion) `data: [{ url }]`.
//
// Real Sora model on the wire is `sora-2`. LenserFight registers `sora-2.0` as
// the canonical key — the model registry handles the alias. This adapter only
// sees the wire name.

const SORA_BASE = 'https://api.openai.com/v1/video/generations';
const PROVIDER = 'OpenAI Sora';

const VALID_SIZES = new Set(['480x854', '854x480', '720x1280', '1280x720', '1080x1920', '1920x1080']);
const MAX_DURATION_S = 20;

interface SoraGenerateResponse {
  id: string;
  status?: 'queued' | 'in_progress' | 'completed' | 'failed';
  estimated_seconds?: number;
}

interface SoraPollResponse {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  data?: Array<{ url: string }>;
  duration?: number;
  error?: { message?: string };
}

function clampDuration(value: number | undefined): number {
  if (!Number.isFinite(value) || (value as number) <= 0) return 5;
  return Math.min(MAX_DURATION_S, Math.max(1, Math.floor(value as number)));
}

function resolveSize(width: number | undefined, height: number | undefined): string {
  const candidate = width && height ? `${width}x${height}` : null;
  if (candidate && VALID_SIZES.has(candidate)) return candidate;
  return '1280x720';
}

export const openaiVideoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
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
    const { duration_s, width, height } = params as {
      duration_s?: number;
      width?: number;
      height?: number;
    };

    const duration = clampDuration(duration_s);
    const size = resolveSize(width, height);

    const res = await withTimeout(
      (signal) => fetch(SORA_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({ model, prompt, duration, size }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const data = (await res.json()) as SoraGenerateResponse;
    if (!data.id) {
      throw new ProviderError({
        code: 'server_error',
        message: 'OpenAI Sora returned no task id.',
        provider: PROVIDER,
        model,
      });
    }
    return {
      status: 'pending',
      providerTaskId: data.id,
      estimatedSeconds: data.estimated_seconds,
    };
  },

  async pollTask(apiKey, providerTaskId): Promise<GenerativeMediaResponse> {
    const res = await withTimeout(
      (signal) => fetch(`${SORA_BASE}/${encodeURIComponent(providerTaskId)}`, {
        headers: this.authHeader(apiKey),
        signal,
      }),
      { provider: PROVIDER, ms: 30_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER });
    }

    const data = (await res.json()) as SoraPollResponse;

    if (data.status === 'completed' && data.data?.length) {
      const urls = data.data.map((d) => d.url);
      return { status: 'completed', urls, mimeType: 'video/mp4', durationSeconds: data.duration };
    }

    if (data.status === 'failed') {
      return {
        status: 'failed',
        providerTaskId,
        message: data.error?.message ?? 'Sora video generation failed.',
      };
    }

    return { status: 'pending', providerTaskId };
  },
};
