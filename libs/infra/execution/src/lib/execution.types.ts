export type MediaType = 'text' | 'image' | 'video' | 'audio'

export interface ExecutionInput {
  prompt: string
  params?: Record<string, unknown>
}

export interface ExecutionResult {
  mediaType: MediaType
  /** URL to the generated media asset (for image/video/audio) */
  url?: string
  /** Text output (for text results) */
  text?: string
  /** MIME type of the output (e.g. 'image/png', 'video/mp4') */
  mimeType?: string
  /** Duration in ms the provider took to respond */
  durationMs?: number
  /** Provider-specific metadata (finish_reason, token counts, etc.) */
  metadata?: Record<string, unknown>
}

export interface IExecutionProvider {
  /** Unique provider identifier used in the registry (e.g. 'fal-ai', 'gemini') */
  readonly id: string
  /** Media types this provider can produce */
  readonly supportedMediaTypes: MediaType[]
  execute(modelId: string, input: ExecutionInput): Promise<ExecutionResult>
}
