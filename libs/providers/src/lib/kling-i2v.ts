import type {
  GenerativeMediaAdapter,
  AsyncGenerationResponse,
  GenerativeMediaResponse,
} from './types'

// ─── Kling AI — Image to Video (i2v) ─────────────────────────────────────────
// Async: POST /v1/videos/image2video → returns task_id.
// Poll:  GET  /v1/videos/image2video/{task_id} → status matches text2video.
// Requires params.image_url (base64 or URL of the source image).

const KLING_BASE = 'https://api.klingai.com'

export const klingI2vAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { Authorization: `Bearer ${apiKey}` }
  },

  async generate(apiKey, model, prompt, params = {}): Promise<AsyncGenerationResponse> {
    const {
      image_url,
      image_tail_url,
      duration_s = 5,
    } = params as {
      image_url: string
      image_tail_url?: string
      duration_s?: number
    }

    if (!image_url) {
      throw new Error('kling-i2v requires params.image_url')
    }

    const modelMap: Record<string, string> = {
      'kling-2.0': 'kling-v2',
      'kling-1.6': 'kling-v1-6',
    }
    const modelName = modelMap[model] ?? 'kling-v2'

    const res = await fetch(`${KLING_BASE}/v1/videos/image2video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
      body: JSON.stringify({
        model_name: modelName,
        prompt,
        image: image_url,
        image_tail: image_tail_url,
        duration: String(duration_s),
        mode: 'std',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`kling-i2v generate failed (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { code: number; data: { task_id: string } }
    if (data.code !== 0) {
      throw new Error(`kling-i2v error code ${data.code}`)
    }

    return { status: 'pending', taskId: data.data.task_id }
  },

  async pollTask(apiKey, taskId): Promise<GenerativeMediaResponse> {
    const res = await fetch(`${KLING_BASE}/v1/videos/image2video/${taskId}`, {
      headers: this.authHeader(apiKey),
    })

    if (!res.ok) {
      throw new Error(`kling-i2v poll failed (${res.status})`)
    }

    const data = (await res.json()) as {
      data: {
        task_status: 'submitted' | 'processing' | 'succeed' | 'failed'
        task_result?: { videos?: Array<{ url: string; duration: string }> }
      }
    }

    const task = data.data
    if (task.task_status === 'succeed') {
      const video = task.task_result?.videos?.[0]
      return {
        status: 'completed',
        urls: video ? [video.url] : [],
        mimeType: 'video/mp4',
        durationSeconds: video ? Number.parseFloat(video.duration) : undefined,
      }
    }
    if (task.task_status === 'failed') {
      throw new Error('kling-i2v generation failed')
    }
    return { status: 'pending', taskId }
  },
}
