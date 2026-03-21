import { AuthorProfile } from './lenser.types'

export type Visibility = 'public' | 'community' | 'private'
export type ContentStatus = 'draft' | 'published' | 'archived'

export interface PromptData {
  title: string
  description: string
  actionLabel?: string
}

export interface CreateThreadDTO {
  title: string
  content: string
  tagIds: string[]
  visibility: Visibility
}

export interface TagRecord {
  id: string
  slug: string
  name: string
  created_at?: string // Optional for denormalized JSONB
}

export interface ThreadRecord {
  id: string
  lenser_id: string
  author_profile: AuthorProfile // Denormalized JSONB
  title: string
  content: string
  visibility: Visibility
  status: ContentStatus
  view_count: number
  reply_count: number
  reaction_totals?: Record<string, number> // JSONB from DB
  tags: TagRecord[] // Denormalized JSONB
  created_at: string
  updated_at: string
  thumbnail_url?: string
  /** Replaces prompt_data. FK to content.prompt_templates(id). */
  linked_prompt_id?: string | null
  /**
   * @deprecated Use linked_prompt_id instead.
   * Kept for backward compatibility while existing thread rows are migrated.
   */
  prompt_data?: PromptData
}

export interface ThreadTagRecord {
  thread_id: string
  tag_id: string
}

export interface ThreadReplyRecord {
  id: string
  thread_id: string
  parent_reply_id?: string | null
  lenser_id: string
  author_profile: AuthorProfile // Denormalized JSONB
  content: string
  reaction_totals?: Record<string, number> // JSONB from DB
  created_at: string
  deleted_at?: string | null
}

export interface ThreadReactionRecord {
  id: string
  thread_id: string
  lenser_id: string
  created_at: string
}

export interface ThreadAuthor {
  id: string
  displayName: string
  avatarUrl?: string | null
  handle: string
}

export interface ThreadFeedItem {
  id: string
  author: ThreadAuthor
  title: string
  content: string
  tags: TagRecord[]
  reactionCount: number
  replyCount: number
  createdAt: string
  userHasReacted: boolean
  visibility: Visibility
  status: ContentStatus
  hotScore?: number
  primaryLanguage?: string
}

export interface PersonalFeedItem extends ThreadFeedItem {
  personalScore: number
}

export interface ThreadReplyViewModel {
  id: string
  author: ThreadAuthor
  content: string
  createdAt: string
  reactionCount: number
  userHasReacted: boolean
  isDeleted: boolean
  replies?: ThreadReplyViewModel[]
}

export interface ThreadDetailViewModel {
  id: string
  title: string
  content: string
  createdAt: string
  author: ThreadAuthor
  tags: TagRecord[]
  reactionCount: number
  userHasReacted: boolean
  replies: ThreadReplyViewModel[]
  promptBlock?: PromptData
  visibility: Visibility
  status: ContentStatus
}
