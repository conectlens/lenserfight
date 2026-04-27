import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── OpenAI Image Generation (DALL-E) ────────────────────────────────────────
// Sync: POST /v1/images/generations → returns urls immediately.
// Supports: dall-e-3, dall-e-4

interface DalleRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  response_format?: 'url' | 'b64_json';
}

interface DalleResponse {
  data: Array<{ url?: string; b64_json?: string }>;
}

const OPENAI_IMAGE_BASE = 'https://api.openai.com/v1/images/generations';

export const openaiImageAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    const { n = 1, width, height, quality, style } = params as {
      n?: number;
      width?: number;
      height?: number;
      quality?: 'standard' | 'hd';
      style?: string;
    };

    const size = width && height ? `${width}x${height}` : '1024x1024';

    const body: DalleRequest = {
      model,
      prompt,
      n,
      size,
      quality: quality ?? 'standard',
      style: (style as 'vivid' | 'natural') ?? 'vivid',
      response_format: 'url',
    };

    const res = await fetch(OPENAI_IMAGE_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI image error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as DalleResponse;
    const urls = data.data.map((d) => d.url ?? '').filter(Boolean);
    if (urls.length === 0) throw new Error('OpenAI returned no image URLs');

    const [w, h] = size.split('x').map(Number);
    return { status: 'completed', urls, mimeType: 'image/png', width: w, height: h };
  },
};
