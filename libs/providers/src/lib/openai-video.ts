import type { GenerativeMediaAdapter, AsyncGenerationResponse, GenerativeMediaResult, GenerativeMediaResponse } from './types';

// ─── OpenAI Video Generation (Sora) ──────────────────────────────────────────
// Async: POST /v1/video/generations → returns a task ID.
// Poll:  GET  /v1/video/generations/{id} → status = 'completed' | 'in_progress' | 'failed'

interface SoraGenerateResponse {
  id: string;
  status: 'in_progress' | 'completed' | 'failed';
  estimated_seconds?: number;
}

interface SoraPollResponse {
  id: string;
  status: 'in_progress' | 'completed' | 'failed';
  data?: Array<{ url: string }>;
  duration?: number;
}

const SORA_BASE = 'https://api.openai.com/v1/video/generations';

export const openaiVideoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const { duration_s = 5, width = 1280, height = 720 } = params as {
      duration_s?: number;
      width?: number;
      height?: number;
    };

    const res = await fetch(SORA_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({ model, prompt, duration: duration_s, width, height }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sora error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as SoraGenerateResponse;
    return {
      status: 'pending',
      taskId: data.id,
      estimatedSeconds: data.estimated_seconds,
    };
  },

  async pollTask(apiKey, taskId): Promise<GenerativeMediaResponse> {
    const res = await fetch(`${SORA_BASE}/${taskId}`, {
      headers: this.authHeader(apiKey),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sora poll error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as SoraPollResponse;

    if (data.status === 'completed' && data.data?.length) {
      const urls = data.data.map((d) => d.url);
      return { status: 'completed', urls, mimeType: 'video/mp4', durationSeconds: data.duration };
    }

    if (data.status === 'failed') {
      throw new Error('Sora video generation failed');
    }

    return { status: 'pending', taskId };
  },
};
