export type TargetType = 'thread' | 'thread_reply' | 'prompt_template'

// 'saved' and 'copy' are treated as reaction types for prompts to keep the system unified
export type ReactionType = 'like' | 'love' | 'clap' | 'saved' | 'copy'

export interface ReactionRecord {
  id: string
  lenser_id: string
  target_type: TargetType
  target_id: string
  reaction: ReactionType
  created_at: string
}

export interface ReactionCount {
  reaction: ReactionType
  count: number
}

export interface ReactionSummary {
  counts: Record<ReactionType, number> // e.g. { like: 10, love: 5 }
  total: number
  userReactions: ReactionType[] // List of reactions the current user has made
}

export interface ActivityFeedItem {
  id: string
  reaction: ReactionType
  targetType: TargetType
  targetId: string
  targetTitle: string // The resolved title or excerpt
  createdAt: string
}
