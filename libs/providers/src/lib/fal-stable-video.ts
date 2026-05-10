import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── fal.ai — Stable Video Diffusion (image-to-video) ────────────────────────
// Synchronous via fal.run. Takes an image_url param and produces a short video
// clip. The fal.run endpoint returns synchronously (blocking queue poll).
//
// Model: fal-ai/stable-video-diffusion
// Params: image_url (required), motion_bucket_id (1–255), fps

const FAL_SVD_URL = 'https://fal.run/fal-ai/stable-video-diffusion';

export const falStableVideoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Key ${apiKey}` };
  },

  async generate(apiKey, _model, _prompt, params = {}): Promise<GenerativeMediaResult> {
    const {
      image_url,
      motion_bucket_id = 127,
      fps = 6,
    } = params as { image_url: string; motion_bucket_id?: number; fps?: number };

    if (!image_url) {
      throw new Error('fal-stable-video requires params.image_url');
    }

    const res = await fetch(FAL_SVD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({ image_url, motion_bucket_id, fps }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`fal-stable-video error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { video?: { url: string } };
    if (!data.video?.url) {
      throw new Error('fal stable-video returned no video URL');
    }

    return {
      status: 'completed',
      urls: [data.video.url],
      mimeType: 'video/mp4',
    };
  },
};
