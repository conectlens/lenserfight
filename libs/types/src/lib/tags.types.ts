export type TagVisibility = 'public' | 'private' | 'hidden'

export interface TagRecord {
  id: string
  slug: string
  name: string
  description?: string
  visibility: TagVisibility
  created_at: string
}

export interface TagDTO {
  id: string
  name: string
  slug: string
  visibility: TagVisibility
}

export interface TagUsage extends TagRecord {
  count: number // Total global uses
  trendingScore: number // Calculated score from activity
  weight?: number // Normalized value (1-10) for UI scaling
}

export type ContentType = 'thread' | 'lens' | 'challenge' | 'ai_generation' | 'all'
export type SortOption = 'newest' | 'popular' | 'trending'

export interface TaggedContentItem {
  id: string
  type: ContentType
  title: string
  description?: string
  createdAt: string
  author: {
    id: string
    displayName: string
    handle: string
    avatarUrl?: string | null
  }
  stats: {
    views?: number
    likes?: number
    uses?: number
    replies?: number
  }
  data: any // The original record for the renderer
}

export interface TagContentProvider {
  type: ContentType
  label: string
  listByTag(
    tagSlug: string,
    sort: SortOption,
    currentLenserId?: string,
    offset?: number,
    limit?: number,
  ): Promise<TaggedContentItem[]>
}

export interface TagFollowRecord {
  tagId: string
  slug: string
  name: string
  followedAt: string
}

export type ReportReasonEnum = 'spam' | 'harassment' | 'misinformation' | 'off_topic' | 'other'

export const REPORT_REASONS: ReportReasonEnum[] = ['spam', 'harassment', 'misinformation', 'off_topic', 'other']

export interface ContentReportDTO {
  targetType: 'thread' | 'lens'
  targetId: string
  reason: ReportReasonEnum
}

export interface TagActivityEventDTO {
  tag_id: string
  entity_type: ContentType
  entity_id: string
  activity_type: 'created' | 'viewed' | 'reacted'
  actor_id?: string
}
