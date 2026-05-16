import { AuthorProfile } from './lenser.types'
import { TagRecord } from './threads.types'

export type VisibilityEnum = 'public' | 'community' | 'private'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type ReactionEnum = 'like' | 'love' | 'clap' | 'saved' | 'copy'

export const LENS_MIN_TEMPLATE_LENGTH = 50

export type LensParamType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array'

export interface LensParam {
  name: string
  type: LensParamType
  required: boolean
  default?: any
  description?: string
  min?: number
  max?: number
  regex?: string
  options?: { label: string; value: string }[]
  itemType?: 'string' | 'number'
  arrayFormat?: 'comma' | 'newline' | 'json'
  placeholder?: string
}

export interface LensRecord {
  id: string
  lenser_id: string
  author_profile: AuthorProfile // Denormalized JSONB
  title: string
  description?: string | null
  content: string
  visibility: VisibilityEnum
  status: ContentStatus
  reaction_totals?: Record<string, number> // JSONB
  tags: TagRecord[] // Denormalized JSONB
  created_at: string
  updated_at: string
  parent_lens_id?: string | null
  forked_from_execution_id?: string | null
  params?: LensParam[] | null
}

export interface LensTagRecord {
  template_id: string
  tag_id: string
  created_at?: string
  user_agent?: string
}

export interface LensReactionRecord {
  id: string
  template_id: string
  lenser_id: string
  reaction: ReactionEnum
  created_at: string
}

export interface LensAuthor {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string | null
}

export interface LensViewModel {
  id: string
  title: string
  description?: string | null
  author: LensAuthor
  tags: TagRecord[]
  usageCount: number
  createdAt: string
  visibility: VisibilityEnum
  status: ContentStatus
  latestVersionNumber?: number
  /** Output modality declared on the latest version's output_contract.kind. */
  outputKind?: 'text' | 'image' | 'video' | 'audio' | 'music' | null
}

export interface PersonalLensFeedItem extends LensViewModel {
  personalScore: number
  hotScore?: number
  primaryLanguage?: string
}

export interface LensDetailViewModel extends LensViewModel {
  content: string
  reactionCounts: Record<ReactionEnum, number>
  isSaved: boolean
  parentLensId?: string | null
  forkedFromExecutionId?: string | null
  params: LensParam[]
  /** ID of the latest (non-archived) version — used to fetch version params when editing. */
  latestVersionId?: string | null
  /** Full latest published version (template + params) from the same bootstrap RPC. Avoids a follow-up fetch. */
  latestPublishedVersion?: LensVersion | null
}

export interface CreateLensDTO {
  title: string
  description?: string | null
  content: string
  tagIds: string[]
  visibility: VisibilityEnum
  parentLensId?: string | null
  forkedFromExecutionId?: string | null
  params?: CreateVersionParamInput[]
}

// ─── Lens Versioning ────────────────────────────────────────────────────────

/**
 * Parameter types for a versioned lens.
 * Mirrors the SQL type constraint on lenses.tools.type.
 */
export type LensVersionParamType =
  | 'text'
  | 'textarea'
  | 'json'
  | 'number'
  | 'integer'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'array'
  | 'url'
  | 'date'
  | 'datetime'
  | 'file'

/** Mirrors lenses.tools */
export interface ToolRecord {
  id: string
  key: string
  label: string | null
  description: string | null
  category: 'input' | 'media' | 'execution' | 'battle' | 'system'
  type: LensVersionParamType
  required: boolean
  minLength: number
  maxLength: number
  placeholder: string | null
  helpText: string | null
  validationSchema: {
    min?: number | null
    max?: number | null
    urlScheme?: string[] | null
    allowedMimeTypes?: string[] | null
  } | null
  options: { label: string; value: string }[] | null
  sortOrder: number
  isSystem: boolean
  icon: string | null
  color: string | null
}

/**
 * Mirrors lenses.version_parameters (new 4-col schema).
 * Each param references a tool from lenses.tools via tool_id.
 * The `tool` field is hydrated via fn_get_version_params_with_tools.
 */
export interface LensVersionParam {
  id: string
  versionId: string
  /** Human-readable label used in [[label]] template tokens and as the user-facing name. */
  label: string
  toolId: string
  /** Full tool definition — always present when loaded via fn_get_version_params_with_tools. */
  tool: ToolRecord
}

/** Input shape for creating/updating version parameters. */
export type CreateVersionParamInput = {
  label: string
  toolId: string
}

/** Mirrors lenses.versions */
export interface LensVersion {
  id: string
  lensId: string
  versionNumber: number
  /** Human-readable [[label]] format (rendered by fn_render_version_body). */
  templateBody: string
  status: ContentStatus
  changelog?: string | null
  parentVersionId?: string | null
  publishedAt?: string | null
  createdAt: string
  parameterCount?: number
  parameters?: LensVersionParam[]
}

export interface CreateLensVersionDTO {
  lensId: string
  templateBody: string
  changelog?: string | null
  parentVersionId?: string | null
  parameters?: CreateVersionParamInput[]
}

// ─── Fork Tree ───────────────────────────────────────────────────────────────

/** One node in a lens fork ancestry chain (from vw_fork_history). */
export interface ForkNode {
  lensId: string
  forkedFromLensId: string
  forkedFromTitle: string
  depth: number
  forkedFromLenserId: string
  forkedFromLenserName: string
  forkedFromLenserHandle: string
  forkedFromLenserAvatarUrl?: string | null
  /** The specific version row this lens was cloned from (nullable for pre-migration forks). */
  forkedFromVersionId?: string | null
  /** Version number for display: "Forked from LensTitle v3" (nullable for pre-migration forks). */
  forkedFromVersionNumber?: number | null
}

export interface CloneLensDTO {
  sourceLensId: string
  versionId?: string | null
}

// Semantic type alias — a Ray is the output unit (was called "Len" previously)
export type Ray = {
  id: string
  lensId: string
  lenserId: string
  runId: string
  versionId?: string | null
  paymentMethod: 'byok' | 'wallet' | 'free'
  createdAt: string
}

export interface LensStep {
  id: string
  lensId: string
  versionId?: string | null
  ordinal: number
  stepType: 'lens' | 'tool_call' | 'model_call' | 'retrieval' | 'transform'
  instruction?: string | null
  modelId?: string | null
  inputMap?: Record<string, string> | null // maps prior step output keys to this step's inputs
  outputKey?: string | null // key name for this step's output
}
