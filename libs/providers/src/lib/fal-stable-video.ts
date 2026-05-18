import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── fal.ai — Stable Video Diffusion (image-to-video) ────────────────────────
// Synchronous via fal.run; blocking queue poll under the hood. Takes an image
// and produces a short clip.

const FAL_SVD_URL = 'https://fal.run/fal-ai/stable-video-diffusion';
const PROVIDER = 'fal.ai (SVD)';

export const falStableVideoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Key ${apiKey}` };
  },

  async generate(apiKey, _model, _prompt, params = {}): Promise<GenerativeMediaResult> {
    const {
      image_url,
      motion_bucket_id = 127,
      fps = 6,
    } = params as { image_url?: string; motion_bucket_id?: number; fps?: number };

    if (!image_url) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'fal-stable-video requires params.image_url.',
        provider: PROVIDER,
      });
    }

    const bucket = Math.max(1, Math.min(255, Math.floor(motion_bucket_id)));
    const fpsClamped = Math.max(1, Math.min(30, Math.floor(fps)));

    const res = await withTimeout(
      (signal) => fetch(FAL_SVD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({ image_url, motion_bucket_id: bucket, fps: fpsClamped }),
        signal,
      }),
      { provider: PROVIDER, ms: 120_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER });
    }

    const data = (await res.json()) as { video?: { url: string } };
    if (!data.video?.url) {
      throw new ProviderError({
        code: 'server_error',
        message: 'fal stable-video returned no video URL.',
        provider: PROVIDER,
      });
    }

    return {
      status: 'completed',
      urls: [data.video.url],
      mimeType: 'video/mp4',
    };
  },
};
