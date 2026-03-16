export interface AuthorProfile {
  id: string
  handle: string
  display_name: string
  avatar_url?: string | null
}

export interface LenserCompactProfile {
  handle: string
  display_name: string
  avatar_url: string | null
  xp: number
  current_level: number
}

export interface LenserPreferences {
  theme?: 'light' | 'dark' | 'system'
  sidebar_collapsed?: boolean
  [key: string]: any // Forward compatibility
}

export interface Language {
  code: string
  name: string
  native_name: string
  direction: 'ltr' | 'rtl'
  is_active: boolean
}

export interface Lenser {
  id: string // uuid
  user_id?: string // references auth.users.id (Optional in public views)
  handle: string // unique
  display_name: string
  bio?: string
  avatar_url?: string | null
  banner_url?: string | null
  headline?: string
  location?: string
  website_url?: string
  website_display_name?: string
  visibility?: 'public' | 'private'
  is_in_waiting_list?: boolean
  is_super_admin?: boolean // Added for RBAC via Lenser profile
  preferred_language?: string
  preferences?: LenserPreferences
  onboarding_step?: number         // 0=not started, 1=handle created, 2=complete
  onboarding_completed_at?: string | null
  created_at: string
  updated_at?: string
  join_order?: number // Immutable rank from lenser_join_log
  deletion_requested_at?: string | null
}

export interface LenserBadge {
  type: string
  category: string
  label: string
  description: string | null
  icon: string | null
  awarded_at: string
}

export interface LenserFullProfile {
  // Core Fields
  id: string
  user_id?: string // Optional in public views
  handle: string
  display_name: string
  bio?: string
  headline?: string
  avatar_url?: string | null
  banner_url?: string | null
  website_url?: string
  status?: string
  join_order?: number

  // Engagement Stats
  thread_count: number
  prompt_count: number
  follower_count: number
  following_count: number

  // XP & Gamification
  xp: number
  current_level: number
  global_rank: number
  xp_min: number
  xp_max: number
  badges: LenserBadge[]
}

export type SocialPlatform =
  | 'LinkedIn'
  | 'GitHub'
  | 'Instagram'
  | 'Facebook'
  | 'X'
  | 'Youtube'
  | 'Other'

export interface SocialLink {
  id: string
  lenser_id: string
  platform: SocialPlatform
  url: string
  label?: string | null
  created_at?: string
}

export interface CreateLenserDTO {
  handle: string
  display_name: string
  bio?: string
}

export interface LenserState {
  lenser: Lenser | null
  isLoading: boolean
  error: string | null
}

export interface LenserStats {
  threadsCount: number
  promptsCount: number
  followersCount: number
  followingCount: number
  winsCount?: number
}

export interface LenserActivityPoint {
  date: string
  count: number
}

export interface ActionRecord {
  id: string
  type: string
  description: string
  created_at: string
}

export interface NetworkUser {
  id: string
  handle: string
  display_name: string
  avatar_url?: string | null
  is_following: boolean
}

export interface LenserProfileDTO {
  // Identity
  id: string
  handle: string // unique
  display_name: string
  avatar_url?: string | null
  banner_url?: string | null

  headline?: string
  bio?: string

  // Status
  status?: 'active' | 'inactive' | 'banned'
  created_at?: string

  // XP / Level
  total_xp: string | null // bigint → string
  current_level: number | null
  min_xp?: string | null // bigint → string
  max_xp?: string | null // bigint → string
  app_id?: string | null

  // Engagement stats (pre-aggregated)
  thread_count?: number
  prompt_count?: number
  follower_count?: number
  following_count?: number

  // Community join info
  join_order?: number // immutable
  joined_at?: string

  // Future-safe placeholders
  badges?: [] | null
}
