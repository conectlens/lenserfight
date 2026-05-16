import type { NodeOutputEnvelope } from '@lenserfight/types'

export type MediaType = 'text' | 'json' | 'image' | 'video' | 'audio' | 'pdf'

// AP: Node type taxonomy — includes multimodal_chain for combined image→video workflows
// CN: Extended with logic, data, and flow-control node types for sector-standard coverage
export type WorkflowNodeType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'multimodal_chain'
  | 'delegate'
  | 'condition'
  | 'merge'
  // CT — Triggers
  | 'manual_trigger'
  | 'event_trigger'
  | 'form_input_trigger'
  // CN — Logic & Data Foundation
  | 'code'
  | 'json_transform'
  | 'set_variables'
  | 'switch'
  | 'loop_map'
  | 'wait_delay'
  | 'error_catch'
  | 'sub_workflow'
  | 'if_condition'
  | 'try_catch'
  | 'split_in_batches'
  | 'stop_return'
  // CN — Data Extended
  | 'extract_field'
  | 'rename_field'
  | 'filter_items'
  | 'aggregate'
  | 'sort'
  | 'deduplicate'
  | 'text_splitter'
  | 'data_mapper'
  // CO ��� AI Primitive Nodes
  | 'prompt_template'
  | 'output_parser'
  | 'embedding'
  | 'rag_retrieval'
  | 'judge_evaluator'
  | 'memory_read'
  | 'memory_write'
  | 'chain'
  | 'lens_execute'
  | 'agent_execute'
  | 'vector_search'
  | 'summarizer'
  | 'classifier'
  | 'translator'
  | 'image_analyze'
  | 'audio_transcribe'
  | 'video_analyze'
  // CX — Battle / Arena
  | 'battle_create'
  | 'battle_execute'
  | 'contender_run'
  | 'judge_battle'
  | 'vote_collector'
  | 'score_aggregator'
  | 'leaderboard_update'
  // CP — Storage & I/O Nodes
  | 'supabase_query'
  | 'kv_store_read'
  | 'kv_store_write'
  | 'file_reader'
  | 'file_writer'
  | 'webhook_trigger'
  | 'webhook_sender'
  | 'schedule_trigger'
  | 'sql_query'
  | 'object_storage_upload'
  | 'object_storage_download'
  | 'http_request'
  | 'graphql_request'
  // CQ — Communication & Integrations
  | 'email_send'
  | 'slack_notify'
  | 'discord_notify'
  | 'telegram_notify'
  | 'push_notification'
  | 'sms_send'
  | 'github_read'
  | 'github_pr_review'
  | 'github_issue_create'
  | 'rss_feed'
  | 'notion_read'
  | 'notion_write'
  | 'google_sheets_read'
  | 'google_sheets_write'
  | 'calendar_create'
  | 'linear_issue_create'
  | 'jira_issue_create'
  // CM — Media Generation
  | 'text_to_image'
  | 'image_to_image'
  | 'image_to_audio'
  | 'text_to_speech'
  | 'speech_to_text'
  | 'text_to_video'
  | 'image_upscale'
  | 'media_convert'
  // CU — Utility
  | 'logger'
  | 'debug_inspector'
  | 'secret_resolver'
  | 'rate_limit'
  | 'cache_read'
  | 'cache_write'
  | 'retry'
  | 'noop'

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
