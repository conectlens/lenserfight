import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── Stability AI (Image Generation) ─────────────────────────────────────────
// Sync: POST /v2beta/stable-image/generate/core → returns image bytes.
// Supports: stable-diffusion-4, stable-image-core, stable-image-ultra

const STABILITY_BASE = 'https://api.stability.ai';

export const stabilityAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
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

    // Map model key to endpoint path
    const endpointMap: Record<string, string> = {
      'stable-diffusion-4': '/v2beta/stable-image/generate/sd3',
      'stable-image-core': '/v2beta/stable-image/generate/core',
      'stable-image-ultra': '/v2beta/stable-image/generate/ultra',
    };
    const path = endpointMap[model] ?? '/v2beta/stable-image/generate/core';

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    form.append('aspect_ratio', aspect_ratio);
    if (negative_prompt) form.append('negative_prompt', negative_prompt);
    if (seed !== undefined) form.append('seed', String(seed));
    if (style) form.append('style_preset', style);

    const res = await fetch(`${STABILITY_BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'image/*', ...this.authHeader(apiKey) },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stability error ${res.status}: ${text}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    return { status: 'completed', urls: [url], mimeType: 'image/png' };
  },
};
