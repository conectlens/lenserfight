import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { ImageResponse } from './types';

// ─── FAL.ai (Flux image generation) ───────────────────────────────────────────
// Synchronous fal.run dispatch. Endpoint requires `fal-ai/flux/*` model paths.
// Verified: https://fal.ai/models/fal-ai/flux  /  https://fal.ai/docs

const PROVIDER = 'fal.ai';

const VALID_IMAGE_SIZES = new Set([
  'square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9',
]);

interface FalResponse {
  images: Array<{ url: string }>;
}

export async function callFal(
  apiKey: string,
  model: string,
  prompt: string,
  numImages = 1,
  imageSize = 'square_hd',
): Promise<ImageResponse> {
  if (!prompt || !prompt.trim()) {
    throw new ProviderError({
      code: 'invalid_request',
      message: 'fal.ai requires a non-empty prompt.',
      provider: PROVIDER,
      model,
    });
  }

  if (!model.startsWith('fal-ai/flux/')) {
    throw new ProviderError({
      code: 'unsupported_model',
      message: `Invalid fal.ai model: ${model}. Expected fal-ai/flux/* format.`,
      provider: PROVIDER,
      model,
    });
  }

  if (!Number.isFinite(numImages) || numImages < 1 || numImages > 4) {
    throw new ProviderError({
      code: 'invalid_request',
      message: `num_images must be between 1 and 4, got ${numImages}.`,
      provider: PROVIDER,
      model,
    });
  }

  const size = VALID_IMAGE_SIZES.has(imageSize) ? imageSize : 'square_hd';

  const res = await withTimeout(
    (signal) => fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
      body: JSON.stringify({ prompt, num_images: numImages, image_size: size, sync_mode: true }),
      signal,
    }),
    { provider: PROVIDER, model, ms: 90_000 },
  );

  if (!res.ok) {
    throw await mapHttpError(res, { provider: PROVIDER, model });
  }

  const data = (await res.json()) as FalResponse;
  const urls = (data.images ?? []).map((img) => img.url);
  if (urls.length === 0) {
    throw new ProviderError({
      code: 'server_error',
      message: 'fal.ai returned no images.',
      provider: PROVIDER,
      model,
    });
  }

  return { urls, units: urls.length };
}
