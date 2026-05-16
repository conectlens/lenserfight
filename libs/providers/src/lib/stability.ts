import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── Stability AI (Image Generation) ─────────────────────────────────────────
// Sync POST /v2beta/stable-image/generate/{core|ultra|sd3} → image bytes.
// Verified: https://platform.stability.ai/docs/api-reference#tag/Generate
// `style_preset` enum: 3d-model, analog-film, anime, cinematic, comic-book,
// digital-art, enhance, fantasy-art, isometric, line-art, low-poly,
// modeling-compound, neon-punk, origami, photographic, pixel-art, tile-texture.
// Anything else 400s — we whitelist before sending.

const STABILITY_BASE = 'https://api.stability.ai';
const PROVIDER = 'Stability';

const VALID_STYLE_PRESETS = new Set([
  '3d-model', 'analog-film', 'anime', 'cinematic', 'comic-book',
  'digital-art', 'enhance', 'fantasy-art', 'isometric', 'line-art',
  'low-poly', 'modeling-compound', 'neon-punk', 'origami', 'photographic',
  'pixel-art', 'tile-texture',
]);
const VALID_ASPECTS = new Set([
  '1:1', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21',
]);

const ENDPOINT_BY_MODEL: Record<string, string> = {
  'sd3.5-large':       '/v2beta/stable-image/generate/sd3',
  'sd3.5-large-turbo': '/v2beta/stable-image/generate/sd3',
  'sd3.5-medium':      '/v2beta/stable-image/generate/sd3',
  core:                '/v2beta/stable-image/generate/core',
  ultra:               '/v2beta/stable-image/generate/ultra',
};

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export const stabilityAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Stability requires a non-empty prompt.',
        provider: PROVIDER,
        model,
      });
    }
    const {
      negative_prompt,
      aspect_ratio = '1:1',
      seed,
      style,
    } = params as {
      negative_prompt?: string;
      aspect_ratio?: string;
      seed?: number;
      style?: string;
    };

    const path = ENDPOINT_BY_MODEL[model] ?? ENDPOINT_BY_MODEL.core;
    const aspect = VALID_ASPECTS.has(aspect_ratio) ? aspect_ratio : '1:1';

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    form.append('aspect_ratio', aspect);
    if (negative_prompt) form.append('negative_prompt', negative_prompt);
    if (Number.isFinite(seed)) form.append('seed', String(seed));
    if (style && VALID_STYLE_PRESETS.has(style)) {
      form.append('style_preset', style);
    }
    // sd3 endpoint also accepts `model` to select sd3.5-large vs turbo.
    if (path.endsWith('/sd3')) {
      form.append('model', model);
    }

    const res = await withTimeout(
      (signal) => fetch(`${STABILITY_BASE}${path}`, {
        method: 'POST',
        headers: { Accept: 'image/*', ...this.authHeader(apiKey) },
        body: form,
        signal,
      }),
      { provider: PROVIDER, model, ms: 90_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new ProviderError({
        code: 'server_error',
        message: 'Stability returned no image data.',
        provider: PROVIDER,
        model,
      });
    }
    const url = `data:image/png;base64,${bufferToBase64(buf)}`;
    return { status: 'completed', urls: [url], mimeType: 'image/png' };
  },
};
