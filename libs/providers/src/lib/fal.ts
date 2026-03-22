import type { ImageResponse } from './types';

// ─── FAL.ai Adapter (Image Generation) ───────────────────────────────────────
// FAL.ai is synchronous only (no streaming text).
// Specialises in Flux image generation models (fal-ai/flux/*).

interface FalRequest {
  prompt: string;
  num_images?: number;
  image_size?: string;
  sync_mode?: boolean;
}

interface FalResponse {
  images: Array<{ url: string }>;
}

export async function callFal(
  apiKey: string,
  model: string,
  prompt: string,
  numImages: number = 1,
  imageSize: string = 'square_hd'
): Promise<ImageResponse> {
  if (!model.startsWith('fal-ai/flux/')) {
    throw new Error(`Invalid FAL model: ${model}. Expected fal-ai/flux/* format.`);
  }

  if (numImages < 1 || numImages > 4) {
    throw new Error(`num_images must be between 1 and 4, got ${numImages}`);
  }

  const request: FalRequest = { prompt, num_images: numImages, image_size: imageSize, sync_mode: true };

  const response = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FAL error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as FalResponse;
  const urls = (data.images ?? []).map((img) => img.url);

  if (urls.length === 0) throw new Error('FAL returned no images');

  return { urls, units: urls.length };
}
