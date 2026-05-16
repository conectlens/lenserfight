import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type {
  AsyncGenerationResponse,
  GenerativeMediaAdapter,
  GenerativeMediaResponse,
} from './types';

// ─── Kling AI — Image to Video (i2v) ─────────────────────────────────────────
// Async POST /v1/videos/image2video → task_id; poll matches text2video shape.
// Requires params.image_url (data URL or hosted URL of the source image).

const KLING_BASE = 'https://api.klingai.com';
const PROVIDER = 'Kling i2v';

const VALID_DURATIONS = new Set([5, 10]);
const VALID_MODES = new Set(['std', 'pro']);

interface KlingResponse {
  code?: number;
  message?: string;
  data?: { task_id?: string };
}

interface KlingPollResponse {
  code?: number;
  data?: {
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_status_msg?: string;
    task_result?: { videos?: Array<{ url: string; duration: string }> };
  };
}

export const klingI2vAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const {
      image_url,
      image_tail_url,
      duration_s,
      mode = 'std',
    } = params as {
      image_url?: string;
      image_tail_url?: string;
      duration_s?: number;
      mode?: string;
    };

    if (!image_url) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Image-to-video requires params.image_url (data URL or hosted URL of source image).',
        provider: PROVIDER,
        model,
      });
    }

    const duration = VALID_DURATIONS.has(duration_s ?? 5) ? duration_s : 5;
    const klingMode = VALID_MODES.has(mode) ? mode : 'std';

    const res = await withTimeout(
      (signal) => fetch(`${KLING_BASE}/v1/videos/image2video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({
          model_name: model,
          prompt,
          image: image_url,
          ...(image_tail_url ? { image_tail: image_tail_url } : {}),
          duration: String(duration),
          mode: klingMode,
        }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const data = (await res.json()) as KlingResponse;
    if (data.code !== 0 || !data.data?.task_id) {
      throw new ProviderError({
        code: 'invalid_request',
        message: data.message ?? `Kling i2v rejected the request (code ${data.code ?? 'unknown'}).`,
        provider: PROVIDER,
        model,
      });
    }
    return { status: 'pending', providerTaskId: data.data.task_id };
  },

  async pollTask(apiKey, providerTaskId): Promise<GenerativeMediaResponse> {
    const res = await withTimeout(
      (signal) => fetch(
        `${KLING_BASE}/v1/videos/image2video/${encodeURIComponent(providerTaskId)}`,
        { headers: this.authHeader(apiKey), signal },
      ),
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
        message: 'Kling i2v returned an unexpected poll payload.',
        provider: PROVIDER,
      });
    }

    if (task.task_status === 'succeed') {
      const video = task.task_result?.videos?.[0];
      const urls = video ? [video.url] : [];
      const duration = video ? Number.parseFloat(video.duration) : undefined;
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
        message: task.task_status_msg ?? 'Kling i2v generation failed.',
      };
    }

    return { status: 'pending', providerTaskId };
  },
};
