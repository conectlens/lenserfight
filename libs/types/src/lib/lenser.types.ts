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

export interface WorkspaceIdentity {
  id: string
  handle: string
  display_name: string
  avatar_url: string | null
  type: LenserType
  is_active: boolean
}

/**
 * Full preferences row from `lensers.preferences` (1:1 with profiles).
 * Non-optional fields mirror DB NOT NULL columns.
 */
export interface LenserPreferences {
  id?: string
  lenser_id?: string
  /** ISO 639-1 language code. Always present, defaults to 'en'. */
  language: string
  theme: 'light' | 'dark' | 'system'
  notifications: Record<string, unknown>
  sidebar: Record<string, unknown>
  content_visibility: 'public' | 'community' | 'private'
  email_digest: boolean
  ai_provider_key?: string | null
  ai_model_key?: string | null
  ai_persona?: string | null
  ai_ruleset: Record<string, unknown>
  selected_api_key_id?: string | null
  wallet_mode: 'BYOK' | 'CLOUD'
  ai_data_usage: boolean
  /** Profile-level default for AI generation funding routing. null = falls back to 'platform_credit'. */
  default_ai_funding_source?: 'platform_credit' | 'user_byok_cloud' | 'user_byok_local' | null
  /** Local BYOK key ID reference (IndexedDB key ID, never the secret itself). */
  default_ai_local_key_id?: string | null
  hide_actions: boolean
  sidebar_collapsed?: boolean
  cron_config: Record<string, unknown>
  country_id?: string | null
  currency?: string | null
  /** When true, the LenserFight arena soundtrack autoplays on Battle Detail pages. */
  autoplay_music?: boolean
  created_at?: string
  updated_at?: string
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
  visibility?: 'public' | 'private' | 'community'
  is_in_waiting_list?: boolean
  is_super_admin?: boolean // Added for RBAC via Lenser profile
  /** @deprecated Use `preferences.language` from lensers.preferences table. */
  preferred_language?: string
  /** Structured preferences row from lensers.preferences (1:1 with profile). */
  preferences?: LenserPreferences
  onboarding_step?: number // 0=not started, 1=handle created, 2=complete
  onboarding_completed_at?: string | null
  status?: LenserAccountStatus
  created_at: string
  updated_at?: string
  join_order?: number // Immutable rank from lenser_join_log
  deletion_requested_at?: string | null
  xp?: number
  current_level?: number | null
  type?: LenserType
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

export interface TrendingLenser {
  lenserId: string
  handle: string
  displayName: string
  avatarUrl?: string | null
  totalXp: number
  currentLevel: number
  lenserScore: number
}

export interface SuggestedLenser extends TrendingLenser {
  tagOverlapScore: number
}

export interface LeaderboardLenser extends TrendingLenser {
  rank: number
}

export type FollowPeriod = 'weekly' | 'monthly' | 'all_time'

export type ProfileAccessLevel =
  | 'FULL_PROFILE'
  | 'RESTRICTED_PROFILE'
  | 'OWNER_RECOVERY_PROFILE'
  | 'UNAVAILABLE_PROFILE'
export type RelationshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked' | 'removed' | null
export type LenserAccountStatus =
  | 'active'
  | 'suspended'
  | 'deactivated'
  | 'pending_deletion'
  | 'deleted'

export interface RelationshipState {
  viewer_to_subject: RelationshipStatus
  subject_to_viewer: RelationshipStatus
  is_mutual: boolean
  is_blocked: boolean
  is_close_circle: boolean
}

export interface ProfileAccessPayload {
  route_state: ProfileAccessLevel
  access_reason: string
  relationship_state: RelationshipState | null
  profile: LenserProfileDTO | null
  completion_score?: number | null
  activity_timeline?: LenserActivityPoint[] | null
}

export interface LenserFollowStatus {
  following: boolean
  status?: RelationshipStatus
}

export interface PendingFollowRequest {
  id: string
  source_profile_id: string
  handle: string
  display_name: string
  avatar_url: string | null
  requested_at: string
}

export interface FollowsNetworkUser {
  lenserId: string
  handle: string
  displayName: string
  avatarUrl?: string | null
  isFollowing: boolean
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
  status?: LenserAccountStatus
  created_at: string

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

  // Visibility & lifecycle
  visibility?: 'public' | 'private' | 'community'
  deletion_deadline_at?: string | null
  type?: LenserType

  // Content preferences (flat from lensers.preferences table)
  hide_actions?: boolean
  content_visibility?: 'public' | 'community' | 'private'

  // Future-safe placeholders
  badges?: [] | null
}

// Identity type for polymorphic lenser (human or AI agent)
export type LenserType = 'human' | 'ai'

// Lightweight list item returned by fn_lensers_list RPC
export interface LenserListItem {
  id: string
  handle: string
  display_name: string
  avatar_url?: string | null
  bio?: string | null
  type: LenserType
  ai_model_id?: string | null
  created_at: string
  engagement?: Record<string, unknown>
}
