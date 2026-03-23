import { AuthorProfile } from './lenser.types'
import { TagRecord } from './threads.types'

export type VisibilityEnum = 'public' | 'community' | 'private'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type ReactionEnum = 'like' | 'love' | 'clap' | 'saved' | 'copy'

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
}

export interface CreateLensDTO {
  title: string
  description?: string | null
  content: string
  tagIds: string[]
  visibility: VisibilityEnum
  parentLensId?: string | null
  forkedFromExecutionId?: string | null
  params?: LensParam[]
}

// ─── Lens Versioning ────────────────────────────────────────────────────────

/**
 * Parameter types for a versioned lens.
 * Note: DB stores 'text' for the string variant; map via mapVersionParam() in repo.
 */
export type LensVersionParamType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'json'

/** Mirrors content.lens_version_parameters */
export interface LensVersionParam {
  id: string
  versionId: string
  key: string
  label?: string | null
  type: LensVersionParamType
  required: boolean
  defaultValue?: string | null
  placeholder?: string | null
  helpText?: string | null
  validationSchema?: unknown
  options?: { label: string; value: string }[]
  sortOrder: number
}

/** Mirrors content.lens_versions */
export interface LensVersion {
  id: string
  lensId: string
  versionNumber: number
  templateBody: string
  status: ContentStatus
  changelog?: string | null
  parentVersionId?: string | null
  publishedAt?: string | null
  createdAt: string
  // Hydrated at read time
  parameterCount?: number
  parameters?: LensVersionParam[]
}

export interface CreateLensVersionDTO {
  lensId: string
  templateBody: string
  changelog?: string | null
  parentVersionId?: string | null
  parameters?: Omit<LensVersionParam, 'id' | 'versionId'>[]
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
