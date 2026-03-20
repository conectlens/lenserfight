import { AuthorProfile } from './lenser.types'
import { TagRecord } from './threads.types'

export type VisibilityEnum = 'public' | 'community' | 'private'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type ReactionEnum = 'like' | 'love' | 'clap' | 'saved' | 'copy'

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
}

export interface CreatePromptDTO {
  title: string
  description?: string | null
  content: string
  tagIds: string[]
  visibility: VisibilityEnum
  parentPromptId?: string | null
  forkedFromExecutionId?: string | null
}
