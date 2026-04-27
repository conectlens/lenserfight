import type { GenerativeMediaAdapter, AsyncGenerationResponse, GenerativeMediaResponse } from './types';

// ─── Google Lyria (Music / Audio Generation) ─────────────────────────────────
// Async: POST MusicFX / Lyria endpoint → operation name for polling.
// Returns mp3 audio data.

interface LyriaGenerateResponse {
  name: string;
}

interface LyriaPollResponse {
  done?: boolean;
  error?: { message: string };
  response?: {
    audioContent?: string; // base64 mp3
  };
}

export const googleLyriaAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const {
      duration_s = 30,
      project = '',
      region = 'us-central1',
    } = params as { duration_s?: number; project?: string; region?: string };

    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:predictLongRunning`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({
        instances: [{ text: prompt }],
        parameters: { durationSeconds: duration_s },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lyria error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as LyriaGenerateResponse;
    return { status: 'pending', taskId: data.name };
  },

  async pollTask(apiKey, taskId): Promise<GenerativeMediaResponse> {
    const res = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/${taskId}`,
      { headers: this.authHeader(apiKey) }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lyria poll error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as LyriaPollResponse;

    if (data.error) throw new Error(`Lyria failed: ${data.error.message}`);

    if (data.done && data.response?.audioContent) {
      const url = `data:audio/mpeg;base64,${data.response.audioContent}`;
      return { status: 'completed', urls: [url], mimeType: 'audio/mpeg' };
    }

    return { status: 'pending', taskId };
  },
};
