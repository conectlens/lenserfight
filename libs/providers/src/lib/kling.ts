import type { GenerativeMediaAdapter, AsyncGenerationResponse, GenerativeMediaResponse } from './types';

// ─── Kling AI (Video Generation) ─────────────────────────────────────────────
// Async: POST /v1/videos/text2video → returns task_id.
// Poll:  GET  /v1/videos/text2video/{task_id} → status: 'completed' | 'processing' | 'failed'

const KLING_BASE = 'https://api.klingai.com';

interface KlingGenerateResponse {
  code: number;
  data: { task_id: string };
}

interface KlingPollResponse {
  code: number;
  data: {
    task_id: string;
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_result?: {
      videos?: Array<{ url: string; duration: string }>;
    };
  };
}

export const klingAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    // Kling uses JWT in Authorization header — callers should pass the signed JWT as apiKey
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const {
      duration_s = 5,
      aspect_ratio = '16:9',
      negative_prompt,
    } = params as { duration_s?: number; aspect_ratio?: string; negative_prompt?: string };

    // Map model key to Kling model name
    const modelMap: Record<string, string> = {
      'kling-2.0': 'kling-v2',
      'kling-1.6': 'kling-v1-6',
    };
    const modelName = modelMap[model] ?? 'kling-v2';

    const res = await fetch(`${KLING_BASE}/v1/videos/text2video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({
        model_name: modelName,
        prompt,
        negative_prompt,
        cfg_scale: 0.5,
        mode: 'std',
        duration: String(duration_s),
        aspect_ratio,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kling error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as KlingGenerateResponse;
    return { status: 'pending', taskId: data.data.task_id, estimatedSeconds: 60 };
  },

  async pollTask(apiKey, taskId): Promise<GenerativeMediaResponse> {
    const res = await fetch(`${KLING_BASE}/v1/videos/text2video/${taskId}`, {
      headers: this.authHeader(apiKey),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kling poll error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as KlingPollResponse;
    const { task_status, task_result } = data.data;

    if (task_status === 'succeed' && task_result?.videos?.length) {
      const urls = task_result.videos.map((v) => v.url);
      const duration = Number(task_result.videos[0]?.duration ?? 0);
      return { status: 'completed', urls, mimeType: 'video/mp4', durationSeconds: duration };
    }

    if (task_status === 'failed') throw new Error('Kling video generation failed');

    return { status: 'pending', taskId };
  },
};
