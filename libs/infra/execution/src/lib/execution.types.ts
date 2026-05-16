import type { NodeOutputEnvelope } from '@lenserfight/types'

export type MediaType = 'text' | 'image' | 'video' | 'audio' | 'pdf'

// AP: Node type taxonomy — includes multimodal_chain for combined image→video workflows
export type WorkflowNodeType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'multimodal_chain'
  | 'delegate'
  | 'condition'
  | 'merge'

export type ExecutionInputAttachmentKind = 'image' | 'audio' | 'document'

export interface ExecutionInputAttachment {
  kind: ExecutionInputAttachmentKind
  url: string
  mimeType?: string
}

export interface ExecutionInput {
  prompt: string
  params?: Record<string, unknown>
  /** Optional multimodal context (e.g. upstream image URLs wired into the prompt). */
  attachments?: ExecutionInputAttachment[]
}

export interface ExecutionResult {
  mediaType: MediaType
  /** URL to the generated media asset (for image/video/audio/pdf) */
  url?: string
  /** Text output (for text results) */
  text?: string
  /** MIME type of the output (e.g. 'image/png', 'video/mp4', 'application/pdf') */
  mimeType?: string
  /** Size of the produced binary artifact in bytes (image/video/audio/pdf). */
  bytes?: number
  /** Structured fields the node should expose as `envelope.data`. */
  data?: Record<string, unknown>
  /** Duration in ms the provider took to respond */
  durationMs?: number
  /** Provider-specific metadata (finish_reason, token counts, etc.) */
  metadata?: Record<string, unknown>
}

export interface IExecutionProvider {
  /** Unique provider identifier used in the registry (e.g. 'fal-ai', 'google') */
  readonly id: string
  /** Media types this provider can produce */
  readonly supportedMediaTypes: MediaType[]
  execute(modelId: string, input: ExecutionInput, signal?: AbortSignal): Promise<ExecutionResult>
}

// ── Streaming ─────────────────────────────────────────────────────────────

export type StreamChunk =
  | { type: 'partial'; text: string }
  | { type: 'media'; url: string; mime?: string }
  | { type: 'final'; envelope: NodeOutputEnvelope }

export interface IStreamingExecutionProvider extends IExecutionProvider {
  stream(modelId: string, input: ExecutionInput, signal?: AbortSignal): AsyncIterable<StreamChunk>
}

/**
 * Throttled sink for partial output writes from the workflow engine. Callers
 * typically debounce writes on the other side to avoid hammering Supabase.
 */
export type PartialOutputSink = (nodeId: string, partial: { text: string }) => void | Promise<void>

// ── Moderation gateway ────────────────────────────────────────────────────

export type ModerationPhase = 'input' | 'output'

export interface ModerationDecision {
  allowed: boolean
  /** Policy that fired (e.g. 'dictionary', 'regex', 'semantic'). */
  policy?: string
  /** Human-readable reason for surfacing in UI / logs. */
  reason?: string
  /** Per-field severity metadata from the underlying policy. */
  metadata?: Record<string, unknown>
}

export interface ModerationGateway {
  check(phase: ModerationPhase, text: string, nodeId: string): Promise<ModerationDecision>
}
