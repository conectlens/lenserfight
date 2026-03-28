import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

/**
 * Fal AI provider — image, video, and audio generation via fal.ai REST API.
 * Uses @fal-ai/client for request/polling abstraction.
 *
 * modelId examples:
 *   'fal-ai/flux/dev'         → image
 *   'fal-ai/wan/t2v'         → video
 *   'fal-ai/stable-audio'    → audio
 */
export class FalAIProvider implements IExecutionProvider {
  readonly id = 'fal-ai'
  readonly supportedMediaTypes: MediaType[] = ['image', 'video', 'audio']

  async execute(modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
    const start = Date.now()

    // Dynamic import keeps the fal client out of SSR/worker bundles that don't need it.
    const { fal } = await import('@fal-ai/client')

    const result = await fal.subscribe(modelId, {
      input: {
        prompt: input.prompt,
        ...(input.params ?? {}),
      },
    })

    const data = result.data as Record<string, unknown>
    const durationMs = Date.now() - start

    // Detect output shape: fal.ai returns images[], video, or audio_url
    if (Array.isArray(data.images) && (data.images as unknown[]).length > 0) {
      const img = (data.images as Array<{ url: string }>)[0]
      return { mediaType: 'image', url: img.url, mimeType: 'image/png', durationMs, metadata: { modelId } }
    }

    if (typeof data.video === 'object' && data.video !== null) {
      const vid = data.video as { url: string }
      return { mediaType: 'video', url: vid.url, mimeType: 'video/mp4', durationMs, metadata: { modelId } }
    }

    if (typeof data.audio_url === 'string') {
      return { mediaType: 'audio', url: data.audio_url, mimeType: 'audio/mpeg', durationMs, metadata: { modelId } }
    }

    throw new Error(`FalAIProvider: unrecognised output shape from model ${modelId}`)
  }
}
