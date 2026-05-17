/**
 * Workflow node types — shared across canvas, config, and execution layers.
 *
 * Extracted from WorkflowCanvasNode.tsx to avoid circular dependencies and
 * to co-locate the runner config descriptor types used by the modular
 * config panel architecture.
 */
import type { WorkflowNodeRecord, WorkflowEdgeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import type { FundingSource } from '@lenserfight/types'

// ── Core Node Types ─────────────────────────────────────────────────────────

export interface WorkflowNodeConfig {
  model_id?: string | null
  param_overrides?: Record<string, string>
  node_type?:
    | 'lens'
    | 'image_generate'
    | 'web_search'
    | 'http_request'
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
    // CO — AI Primitive Nodes
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
  nodeType?: WorkflowNodeConfig['node_type']
  // Per-node funding source override
  funding_source?: FundingSource
  key_ref_id?: string | null
  local_key_id?: string | null
}

export interface WorkflowNodeData {
  label: string
  ordinal: number
  isPersisted: boolean
  lens_id?: string
  lensVisibility?: 'public' | 'private' | 'unlisted'
  lensLenserId?: string
  isLensOwner?: boolean
  config?: WorkflowNodeConfig
  onRemove?: (id: string) => void
  onDuplicate?: (id: string) => void
  onConfigNode?: (nodeId: string, lensId: string) => void
  onEditLens?: (lensId: string) => void
  /** Current execution status for this node from a live run or dry run. */
  executionStatus?: WorkflowNodeResultRecord['status'] | null
  /** Warning message — populated from output_data._dryRunWarning for mocked side-effect nodes. */
  executionWarning?: string | null
  [key: string]: unknown
}

// ── Runner Config Descriptor System ─────────────────────────────────────────

export type RunnerConfigFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'code'
  | 'datetime'
  | 'schema_builder'
  | 'string_array'
  | 'key_value'

export interface RunnerConfigFieldDescriptor {
  /** Key in param_overrides (without __ prefix — the system adds it) */
  key: string
  label: string
  type: RunnerConfigFieldType
  defaultValue?: string
  required?: boolean
  placeholder?: string
  hint?: string
  /**
   * Extended tooltip content — node-aware, field-aware help.
   * Shown in a tooltip trigger next to the label.
   */
  tooltip?: RunnerFieldTooltip
  /** For 'number' type */
  min?: number
  max?: number
  step?: number
  /** For 'select' type */
  options?: Array<{ value: string; label: string }>
  /** For 'textarea'/'code' type */
  rows?: number
  mono?: boolean
  /**
   * For 'schema_builder' type — allowed field types in the builder.
   * If omitted, all standard types are available.
   */
  allowedSchemaTypes?: SchemaFieldType[]
  /** Validation function — returns error string or null */
  validate?: (value: string, allValues: Record<string, string>) => string | null
}

// ── Schema Builder Types ───────────────────────────────────────────────────

/** Supported types for schema builder fields */
export type SchemaFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'json'
  | 'array'
  | 'file'
  | 'image'
  | 'audio'
  | 'video'
  | 'url'
  | 'datetime'

/** A single field entry in the schema builder */
export interface SchemaFieldEntry {
  id: string
  name: string
  type: SchemaFieldType
  required: boolean
  defaultValue: string
  description: string
  example: string
  /** For 'select'/'multi_select' — pipe-delimited options */
  options?: string
}

// ── Tooltip Metadata ───────────────────────────────────────────────────────

/** Extended tooltip metadata for a field */
export interface RunnerFieldTooltip {
  /** Short summary of what the field does */
  summary: string
  /** When this field is required or important */
  whenRequired?: string
  /** Expected value format or valid inputs */
  format?: string
  /** Common mistakes users make */
  commonMistakes?: string
  /** How this field affects execution behavior */
  executionImpact?: string
}

export interface RunnerOutputField {
  key: string
  type: string
  description: string
}

export type RunnerConfigCategory =
  | 'trigger'
  | 'logic'
  | 'data'
  | 'ai_primitive'
  | 'battle'
  | 'storage'
  | 'communication'
  | 'integration'
  | 'media'
  | 'utility'

export interface RunnerConfigDescriptor {
  /** The node_type this descriptor covers */
  nodeType: string
  /** Human-readable name for the config panel header */
  displayName: string
  /** Category for grouping in UI */
  category: RunnerConfigCategory
  /** Whether this runner needs AI provider/model selection */
  needsAiProvider?: boolean
  /** Fields to render — order matters (rendered top to bottom) */
  fields: RunnerConfigFieldDescriptor[]
  /** Optional banner/callout text at the top of the form */
  banner?: { text: string; variant: 'info' | 'warning' | 'error' }
  /** Output fields this node produces (for downstream visibility) */
  outputFields?: RunnerOutputField[]
  /** Cross-field validation — receives all field values, returns errors keyed by field key */
  validate?: (values: Record<string, string>) => Record<string, string>
}

// ── Runner Config Form Props ────────────────────────────────────────────────

/**
 * Standard props passed to every custom runner config form component.
 * Custom forms receive these when registered via `kind: 'custom'` in the registry.
 */
export interface RunnerConfigFormProps {
  nodeId: string
  config: WorkflowNodeConfig
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  onSave: (nodeId: string, config: WorkflowNodeConfig) => void
  onClose: () => void
}
