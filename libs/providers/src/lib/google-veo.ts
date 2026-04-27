import type { GenerativeMediaAdapter, AsyncGenerationResponse, GenerativeMediaResponse } from './types';

// ─── Google Veo (Video Generation) ───────────────────────────────────────────
// Async: POST predict → returns operation name.
// Poll:  GET  operations/{name} → done: true when complete.

interface VeoGenerateResponse {
  name: string; // operation name used for polling
}

interface VeoPollResponse {
  done?: boolean;
  error?: { message: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri: string; encoding?: string } }>;
    };
  };
}

export const googleVeoAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const {
      duration_s = 8,
      aspect_ratio = '16:9',
      project = '',
      region = 'us-central1',
    } = params as { duration_s?: number; aspect_ratio?: string; project?: string; region?: string };

    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:predictLongRunning`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { durationSeconds: duration_s, aspectRatio: aspect_ratio },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Veo error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as VeoGenerateResponse;
    return { status: 'pending', taskId: data.name };
  },

  async pollTask(apiKey, taskId): Promise<GenerativeMediaResponse> {
    const res = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/${taskId}`,
      { headers: this.authHeader(apiKey) }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Veo poll error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as VeoPollResponse;

    if (data.error) throw new Error(`Veo failed: ${data.error.message}`);

    if (data.done) {
      const samples =
        data.response?.generateVideoResponse?.generatedSamples ?? [];
      const urls = samples.map((s) => s.video?.uri ?? '').filter(Boolean);
      return { status: 'completed', urls, mimeType: 'video/mp4' };
    }

    return { status: 'pending', taskId };
  },
};
