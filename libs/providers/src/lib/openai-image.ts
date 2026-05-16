import {
  clampBatch,
  getOpenAIImageProfile,
  resolveQuality,
  resolveSize,
  type OpenAIImageSize,
} from './openai-image-profiles';
import { ProviderError, mapHttpError } from './provider-errors';
import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── OpenAI Image Generation (DALL-E / gpt-image-1) ──────────────────────────
//
// Single POST /v1/images/generations endpoint, model-specific request shape:
//   - dall-e-2     : size 256/512/1024 square, response_format, no style/quality
//   - dall-e-3     : sizes incl. 1792x1024 / 1024x1792; style, quality, response_format
//   - gpt-image-1  : sizes incl. 1024x1536 / 1536x1024 / auto; quality only; ALWAYS b64_json
//
// `style: 'vivid'` is only valid for dall-e-3. Sending it to gpt-image-1 yields
// `400: Unknown parameter: 'style'.` from the live API. The profile registry
// drives which params we include so this can never happen again.
//
// LenserFight uses forward-looking model keys (e.g. `dall-e-4`). The profile
// registry aliases them to the real OpenAI model name on the wire.

interface DalleResponseItem { url?: string; b64_json?: string }
interface DalleResponse {
  data: DalleResponseItem[];
}

const OPENAI_IMAGE_BASE = 'https://api.openai.com/v1/images/generations';
const PROVIDER = 'OpenAI';

interface OpenAIImageParams {
  n?: number;
  width?: number;
  height?: number;
  size?: string;
  quality?: string;
  style?: string;
  /** Forced response format — only honored by dall-e-2 / dall-e-3 (gpt-image-1 ignores it). */
  response_format?: 'url' | 'b64_json';
}

export const openaiImageAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    const profile = getOpenAIImageProfile(model);
    if (!profile) {
      throw new ProviderError({
        code: 'unsupported_model',
        message: `OpenAI image model "${model}" is not supported. Use dall-e-2, dall-e-3, or gpt-image-1 (aliased as dall-e-4).`,
        provider: PROVIDER,
        model,
      });
    }

    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Image generation requires a non-empty prompt.',
        provider: PROVIDER,
        model: profile.realModel,
      });
    }

    const p = params as OpenAIImageParams;
    const size: OpenAIImageSize = resolveSize(
      profile,
      p.width,
      p.height,
      p.size as OpenAIImageSize | undefined,
    );
    const quality = resolveQuality(profile, p.quality);
    const n = clampBatch(profile, p.n);

    // Build the request body using ONLY parameters the model actually accepts.
    // Anything not whitelisted here is silently dropped — this is the
    // single seam that fixes "Unknown parameter" / "invalid argument" 400s.
    const body: Record<string, unknown> = {
      model: profile.realModel,
      prompt,
      n,
      size,
    };
    if (quality) body.quality = quality;
    if (profile.supportsStyle && p.style) body.style = p.style;
    if (profile.supportsResponseFormat) {
      body.response_format = p.response_format ?? 'url';
    }

    let res: Response;
    try {
      res = await fetch(OPENAI_IMAGE_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderError({
        code: (err as Error).name === 'AbortError' ? 'timeout' : 'server_error',
        message: (err as Error).name === 'AbortError'
          ? 'Image request cancelled.'
          : `Network error contacting OpenAI image API: ${(err as Error).message}`,
        provider: PROVIDER,
        model: profile.realModel,
      });
    }

    if (!res.ok) {
      throw await mapHttpError(res, {
        provider: PROVIDER,
        model: profile.realModel,
        notFoundMessage: `OpenAI does not recognize model "${profile.realModel}". Update the model registry or pick another image model.`,
      });
    }

    const data = (await res.json()) as DalleResponse;
    const items = data.data ?? [];

    const urls = items
      .map((d) => d.url ?? (d.b64_json ? `data:image/png;base64,${d.b64_json}` : ''))
      .filter(Boolean);

    if (urls.length === 0) {
      throw new ProviderError({
        code: 'server_error',
        message: 'OpenAI returned no image data.',
        provider: PROVIDER,
        model: profile.realModel,
      });
    }

    // Parse "WxH" — only useful when we sent an explicit dimension.
    let width: number | undefined;
    let height: number | undefined;
    if (size.includes('x')) {
      const [w, h] = size.split('x').map(Number);
      if (Number.isFinite(w) && Number.isFinite(h)) {
        width = w;
        height = h;
      }
    }

    return { status: 'completed', urls, mimeType: 'image/png', width, height };
  },
};
