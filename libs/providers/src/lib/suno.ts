import type { GenerativeMediaAdapter, AsyncGenerationResponse, GenerativeMediaResponse } from './types';

// ─── Suno (Music Generation) ──────────────────────────────────────────────────
// Async: POST /api/generate → returns clip IDs.
// Poll:  GET  /api/get?ids={id} → status: 'complete' | 'streaming' | 'error'
// Note: Suno's API is unofficial/third-party; endpoint may require proxy.

const SUNO_BASE = 'https://api.sunoapi.org';

interface SunoGenerateResponse {
  id: string;
  status: string;
}

interface SunoClip {
  id: string;
  status: 'complete' | 'streaming' | 'error';
  audio_url?: string;
  duration?: number;
}

interface SunoPollResponse {
  clips: SunoClip[];
}

export const sunoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, _model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const {
      style,
      duration_s = 30,
    } = params as { style?: string; duration_s?: number };

    const res = await fetch(`${SUNO_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({
        prompt,
        tags: style ?? '',
        mv: 'chirp-v4',
        duration: duration_s,
        make_instrumental: false,
        wait_audio: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Suno error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as SunoGenerateResponse;
    return { status: 'pending', taskId: data.id, estimatedSeconds: 30 };
  },

  async pollTask(apiKey, taskId): Promise<GenerativeMediaResponse> {
    const res = await fetch(`${SUNO_BASE}/api/get?ids=${taskId}`, {
      headers: this.authHeader(apiKey),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Suno poll error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as SunoPollResponse;
    const clip = data.clips?.find((c) => c.id === taskId);

    if (!clip) return { status: 'pending', taskId };

    if (clip.status === 'complete' && clip.audio_url) {
      return {
        status: 'completed',
        urls: [clip.audio_url],
        mimeType: 'audio/mpeg',
        durationSeconds: clip.duration,
      };
    }

    if (clip.status === 'error') throw new Error('Suno music generation failed');

    return { status: 'pending', taskId };
  },
};
