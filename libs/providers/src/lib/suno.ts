import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { AsyncGenerationResponse, GenerativeMediaAdapter, GenerativeMediaResponse } from './types';

// ─── Suno (Music Generation) ──────────────────────────────────────────────────
// Async POST /api/generate → clip id; poll GET /api/get?ids=<id>.
// Note: Suno's API is third-party (sunoapi.org); endpoints may move. We
// validate inputs aggressively so a broken proxy surfaces as a real error.

const SUNO_BASE = 'https://api.sunoapi.org';
const PROVIDER = 'Suno';

const VALID_FORMATS = new Set(['mp3', 'wav']);

interface SunoGenerateResponse {
  id?: string;
  status?: string;
}

interface SunoClip {
  id: string;
  status: 'complete' | 'streaming' | 'error' | 'submitted';
  audio_url?: string;
  duration?: number;
}

export const sunoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Music generation requires a non-empty prompt.',
        provider: PROVIDER,
        model,
      });
    }
    const {
      style,
      duration_s = 30,
      make_instrumental = false,
      format = 'mp3',
    } = params as {
      style?: string;
      duration_s?: number;
      make_instrumental?: boolean;
      format?: string;
    };

    const duration = Math.max(5, Math.min(180, Math.floor(duration_s)));
    const requestedFormat = VALID_FORMATS.has(format) ? format : 'mp3';

    const res = await withTimeout(
      (signal) => fetch(`${SUNO_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({
          prompt,
          ...(style ? { tags: style } : {}),
          mv: model,
          duration,
          make_instrumental,
          wait_audio: false,
          format: requestedFormat,
        }),
        signal,
      }),
      { provider: PROVIDER, model, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER, model });
    }

    const data = (await res.json()) as SunoGenerateResponse;
    if (!data.id) {
      throw new ProviderError({
        code: 'server_error',
        message: 'Suno returned no clip id.',
        provider: PROVIDER,
        model,
      });
    }
    return { status: 'pending', providerTaskId: data.id, estimatedSeconds: 30 };
  },

  async pollTask(apiKey, providerTaskId): Promise<GenerativeMediaResponse> {
    const res = await withTimeout(
      (signal) => fetch(
        `${SUNO_BASE}/api/get?ids=${encodeURIComponent(providerTaskId)}`,
        { headers: this.authHeader(apiKey), signal },
      ),
      { provider: PROVIDER, ms: 30_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, { provider: PROVIDER });
    }

    const data = (await res.json()) as { clips?: SunoClip[] };
    const clip = data.clips?.find((c) => c.id === providerTaskId);
    if (!clip) return { status: 'pending', providerTaskId };

    if (clip.status === 'complete' && clip.audio_url) {
      return {
        status: 'completed',
        urls: [clip.audio_url],
        mimeType: 'audio/mpeg',
        durationSeconds: clip.duration,
      };
    }

    if (clip.status === 'error') {
      return {
        status: 'failed',
        providerTaskId,
        message: 'Suno music generation failed.',
      };
    }

    return { status: 'pending', providerTaskId };
  },
};
