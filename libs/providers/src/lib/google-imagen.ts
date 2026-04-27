import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── Google Imagen (Image Generation) ────────────────────────────────────────
// Sync: POST Vertex AI predict endpoint → returns base64 images.
// Supports: imagen-4, imagegeneration@006

interface ImagenRequest {
  instances: Array<{ prompt: string; negativePrompt?: string }>;
  parameters: {
    sampleCount: number;
    aspectRatio?: string;
    safetyFilterLevel?: string;
    personGeneration?: string;
  };
}

interface ImagenResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

// Callers provide the full Vertex AI endpoint URL (project + region + model-specific).
// Format: https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/publishers/google/models/{MODEL}:predict
export const googleImagenAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    const {
      n = 1,
      aspect_ratio = '1:1',
      negative_prompt,
      project = '',
      region = 'us-central1',
    } = params as {
      n?: number;
      aspect_ratio?: string;
      negative_prompt?: string;
      project?: string;
      region?: string;
    };

    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:predict`;

    const body: ImagenRequest = {
      instances: [{ prompt, ...(negative_prompt ? { negativePrompt: negative_prompt } : {}) }],
      parameters: { sampleCount: n, aspectRatio: aspect_ratio },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Imagen error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as ImagenResponse;
    const predictions = data.predictions ?? [];
    if (predictions.length === 0) throw new Error('Imagen returned no predictions');

    // Convert base64 to data URLs — callers should upload these to storage.
    const urls = predictions.map(
      (p) => `data:${p.mimeType};base64,${p.bytesBase64Encoded}`
    );

    return { status: 'completed', urls, mimeType: predictions[0].mimeType };
  },
};
