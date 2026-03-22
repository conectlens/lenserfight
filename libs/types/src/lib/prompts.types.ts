import { AuthorProfile } from './lenser.types'
import { TagRecord } from './threads.types'

export type VisibilityEnum = 'public' | 'community' | 'private'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type ReactionEnum = 'like' | 'love' | 'clap' | 'saved' | 'copy'

export type PromptParamType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array'

export interface PromptParam {
  name: string
  type: PromptParamType
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

export interface PromptTemplateRecord {
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
  parent_prompt_id?: string | null
  forked_from_execution_id?: string | null
  params?: PromptParam[] | null
}

export interface PromptTemplateTagRecord {
  template_id: string
  tag_id: string
  created_at?: string
  user_agent?: string
}

export interface PromptTemplateReactionRecord {
  id: string
  template_id: string
  lenser_id: string
  reaction: ReactionEnum
  created_at: string
}

export interface PromptAuthor {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string | null
}

export interface PromptTemplateViewModel {
  id: string
  title: string
  description?: string | null
  author: PromptAuthor
  tags: TagRecord[]
  usageCount: number
  createdAt: string
  visibility: VisibilityEnum
  status: ContentStatus
  latestVersionNumber?: number
}

export interface PersonalPromptFeedItem extends PromptTemplateViewModel {
  personalScore: number
  hotScore?: number
  primaryLanguage?: string
}

export interface PromptTemplateDetailViewModel extends PromptTemplateViewModel {
  content: string
  reactionCounts: Record<ReactionEnum, number>
  isSaved: boolean
  parentPromptId?: string | null
  forkedFromExecutionId?: string | null
  params: PromptParam[]
}

export interface CreatePromptDTO {
  title: string
  description?: string | null
  content: string
  tagIds: string[]
  visibility: VisibilityEnum
  parentPromptId?: string | null
  forkedFromExecutionId?: string | null
  params?: PromptParam[]
}

// ─── Prompt Versioning ────────────────────────────────────────────────────────

/**
 * Parameter types for a versioned prompt.
 * Note: DB stores 'text' for the string variant; map via mapVersionParam() in repo.
 */
export type PromptVersionParamType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'json'

/** Mirrors content.prompt_version_parameters */
export interface PromptVersionParam {
  id: string
  versionId: string
  key: string
  label?: string | null
  type: PromptVersionParamType
  required: boolean
  defaultValue?: string | null
  placeholder?: string | null
  helpText?: string | null
  validationSchema?: unknown
  options?: { label: string; value: string }[]
  sortOrder: number
}

/** Mirrors content.prompt_versions */
export interface PromptVersion {
  id: string
  promptId: string
  versionNumber: number
  templateBody: string
  status: ContentStatus
  changelog?: string | null
  parentVersionId?: string | null
  publishedAt?: string | null
  createdAt: string
  // Hydrated at read time
  parameterCount?: number
  parameters?: PromptVersionParam[]
}

export interface CreatePromptVersionDTO {
  promptId: string
  templateBody: string
  changelog?: string | null
  parentVersionId?: string | null
  parameters?: Omit<PromptVersionParam, 'id' | 'versionId'>[]
}
