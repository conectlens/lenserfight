import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { AsyncGenerationResponse, GenerativeMediaAdapter, GenerativeMediaResponse } from './types';

// ─── Kling AI (Video Generation) ─────────────────────────────────────────────
// Async POST /v1/videos/text2video → task_id; poll GET /v1/videos/text2video/{task_id}.
// Verified against KlingAI's public API documentation. `model_name` accepts
// kling-v2-master (a.k.a. the 2.x family) and kling-v1-6. JWT auth.

const KLING_BASE = 'https://api.klingai.com';
const PROVIDER = 'Kling';

const VALID_ASPECTS = new Set(['16:9', '9:16', '1:1']);
const VALID_DURATIONS = new Set([5, 10]);
const VALID_MODES = new Set(['std', 'pro']);

interface KlingGenerateResponse {
  code?: number;
  message?: string;
  data?: { task_id?: string };
}

interface KlingPollResponse {
  code?: number;
  message?: string;
  data?: {
    task_id: string;
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_status_msg?: string;
    task_result?: {
      videos?: Array<{ url: string; duration: string }>;
    };
  };
}

export const klingAdapter: GenerativeMediaAdapter = {
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
    const {
      duration_s,
      aspect_ratio = '16:9',
      negative_prompt,
      mode = 'std',
    } = params as { duration_s?: number; aspect_ratio?: string; negative_prompt?: string; mode?: string };

    const duration = VALID_DURATIONS.has(duration_s ?? 5) ? duration_s : 5;
    const aspect = VALID_ASPECTS.has(aspect_ratio) ? aspect_ratio : '16:9';
    const klingMode = VALID_MODES.has(mode) ? mode : 'std';

    const res = await withTimeout(
      (signal) => fetch(`${KLING_BASE}/v1/videos/text2video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({
          model_name: model,
          prompt,
          ...(negative_prompt ? { negative_prompt } : {}),
          cfg_scale: 0.5,
          mode: klingMode,
          duration: String(duration),
          aspect_ratio: aspect,
        }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const data = (await res.json()) as KlingGenerateResponse;
    if (data.code !== 0 || !data.data?.task_id) {
      throw new ProviderError({
        code: 'invalid_request',
        message: data.message ?? `Kling rejected the request (code ${data.code ?? 'unknown'}).`,
        provider: PROVIDER,
        model,
      });
    }

    return { status: 'pending', providerTaskId: data.data.task_id, estimatedSeconds: 60 };
  },

  async pollTask(apiKey, providerTaskId): Promise<GenerativeMediaResponse> {
    const res = await withTimeout(
      (signal) => fetch(`${KLING_BASE}/v1/videos/text2video/${encodeURIComponent(providerTaskId)}`, {
        headers: this.authHeader(apiKey),
        signal,
      }),
      { provider: PROVIDER, ms: 30_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER });
    }

    const data = (await res.json()) as KlingPollResponse;
    const task = data.data;
    if (!task) {
      throw new ProviderError({
        code: 'server_error',
        message: 'Kling returned an unexpected poll payload.',
        provider: PROVIDER,
      });
    }

    if (task.task_status === 'succeed' && task.task_result?.videos?.length) {
      const urls = task.task_result.videos.map((v) => v.url);
      const duration = Number(task.task_result.videos[0]?.duration ?? 0);
      return {
        status: 'completed',
        urls,
        mimeType: 'video/mp4',
        durationSeconds: Number.isFinite(duration) ? duration : undefined,
      };
    }

    if (task.task_status === 'failed') {
      return {
        status: 'failed',
        providerTaskId,
        message: task.task_status_msg ?? 'Kling video generation failed.',
      };
    }

    return { status: 'pending', providerTaskId };
  },
};
