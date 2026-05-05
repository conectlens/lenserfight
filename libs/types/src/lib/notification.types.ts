// ─── Notification type strings ────────────────────────────────────────────────
// Single source of truth for the discriminant. Must stay in sync with the SQL
// CHECK constraint in public.notifications (migration 20270101000000).

export type NotificationType =
  // Battle (shared human + AI)
  | 'battle_result'
  | 'battle_started'
  | 'vote_reminder'
  // Battle (human-specific)
  | 'vote_received'
  // Battle (AI lenser-specific)
  | 'battle_assigned'
  | 'battle_vote_cast'
  // Social (human)
  | 'follow_new'
  | 'follow_request'
  | 'follow_accepted'
  // Content (human)
  | 'lens_reaction'
  | 'lens_comment'
  // Agent ownership (human owner of AI lenser)
  | 'agent_update'
  | 'agent_cron_result'
  | 'agent_critical'
  // Agent runs (AI lenser's own notifications)
  | 'team_run_started'
  | 'team_run_completed'
  | 'team_run_failed'
  // CRON (AI lenser / workflow owner)
  | 'cron_run_completed'
  | 'cron_run_failed'
  // Config changes (AI lenser)
  | 'policy_updated'
  | 'model_binding_changed'
  | 'requirement_update'
  // System
  | 'badge_awarded'
  | 'system'

// ─── Per-type metadata shapes ─────────────────────────────────────────────────
// Polymorphism via discriminated union: each type carries its own metadata schema.

export interface BattleResultMetadata {
  battle_id: string
  battle_slug: string
  winner_id: string | null
  winner_name: string | null
}

export interface BattleStartedMetadata {
  battle_id: string
  battle_slug: string
  battle_title: string
}

export interface VoteReminderMetadata {
  battle_id: string
  battle_slug: string
  hours_remaining: number
}

export interface VoteReceivedMetadata {
  battle_id: string
  battle_slug: string
  voter_id: string
  voter_handle: string
  vote_value: string
  voted_contender_id: string
}

export interface BattleAssignedMetadata {
  battle_id: string
  battle_slug: string
  battle_title: string
  slot: string
  contender_id: string
}

export interface BattleVoteCastMetadata {
  battle_id: string
  battle_slug: string
  voted_contender_id: string
  vote_value: string
}

export interface FollowNewMetadata {
  follower_id: string
  follower_handle: string
  follower_display_name: string
  follower_avatar_url: string | null
}

export interface FollowRequestMetadata {
  requester_id: string
  requester_handle: string
  requester_display_name: string
  requester_avatar_url: string | null
}

export interface FollowAcceptedMetadata {
  acceptor_id: string
  acceptor_handle: string
  acceptor_display_name: string
  acceptor_avatar_url: string | null
}

export interface LensReactionMetadata {
  reactor_id: string
  reactor_handle: string
  reactor_display_name: string
  reactor_avatar_url: string | null
  reaction: string
  entity_type: 'lens' | 'workflow'
  entity_id: string
}

export interface LensCommentMetadata {
  commenter_id: string
  commenter_handle: string
  commenter_display_name: string
  entity_id: string
  entity_type: string
  preview: string
}

export interface AgentUpdateMetadata {
  ai_lenser_id: string
  ai_profile_id: string | null
  battle_id?: string
  battle_slug?: string
  team_run_id?: string
  workflow_name?: string | null
  event: string
}

export interface AgentCronResultMetadata {
  ai_profile_id: string
  workflow_run_id: string
  workflow_name: string | null
  status: 'completed' | 'failed'
}

export interface AgentCriticalMetadata {
  ai_lenser_id?: string
  ai_profile_id?: string
  team_run_id?: string
  workflow_run_id?: string
  workflow_name: string | null
  status: string
}

export interface TeamRunMetadata {
  team_run_id: string
  workflow_id: string | null
  workflow_name: string | null
  status: string
}

export interface CronRunMetadata {
  workflow_run_id: string
  workflow_id: string
  workflow_name: string | null
  status: 'completed' | 'failed'
}

export interface PolicyUpdatedMetadata {
  ai_lenser_id: string
  changes: Record<string, unknown>
}

export interface ModelBindingChangedMetadata {
  ai_lenser_id: string
  model_id: string
  is_default: boolean
  operation: 'insert' | 'update' | 'delete'
}

export interface RequirementUpdateMetadata {
  requirement_type: string
  description: string
}

export interface BadgeAwardedMetadata {
  badge_id: string
  badge_name: string
  badge_icon_url: string | null
}

export type SystemMetadata = Record<string, unknown>

// ─── Discriminated union (Polymorphism) ───────────────────────────────────────

export type NotificationPayload =
  | { type: 'battle_result';         metadata: BattleResultMetadata }
  | { type: 'battle_started';        metadata: BattleStartedMetadata }
  | { type: 'vote_reminder';         metadata: VoteReminderMetadata }
  | { type: 'vote_received';         metadata: VoteReceivedMetadata }
  | { type: 'battle_assigned';       metadata: BattleAssignedMetadata }
  | { type: 'battle_vote_cast';      metadata: BattleVoteCastMetadata }
  | { type: 'follow_new';            metadata: FollowNewMetadata }
  | { type: 'follow_request';        metadata: FollowRequestMetadata }
  | { type: 'follow_accepted';       metadata: FollowAcceptedMetadata }
  | { type: 'lens_reaction';         metadata: LensReactionMetadata }
  | { type: 'lens_comment';          metadata: LensCommentMetadata }
  | { type: 'agent_update';          metadata: AgentUpdateMetadata }
  | { type: 'agent_cron_result';     metadata: AgentCronResultMetadata }
  | { type: 'agent_critical';        metadata: AgentCriticalMetadata }
  | { type: 'team_run_started';      metadata: TeamRunMetadata }
  | { type: 'team_run_completed';    metadata: TeamRunMetadata }
  | { type: 'team_run_failed';       metadata: TeamRunMetadata }
  | { type: 'cron_run_completed';    metadata: CronRunMetadata }
  | { type: 'cron_run_failed';       metadata: CronRunMetadata }
  | { type: 'policy_updated';        metadata: PolicyUpdatedMetadata }
  | { type: 'model_binding_changed'; metadata: ModelBindingChangedMetadata }
  | { type: 'requirement_update';    metadata: RequirementUpdateMetadata }
  | { type: 'badge_awarded';         metadata: BadgeAwardedMetadata }
  | { type: 'system';                metadata: SystemMetadata }

// ─── DB row type (matches fn_get_notifications RPC return shape) ──────────────

export interface NotificationRow {
  id: string
  lenser_id: string
  type: NotificationType
  title: string
  body: string | null
  action_url: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
  unread_count: number
}

// ─── Category grouping (used by UI filter tabs) ───────────────────────────────

export type NotificationCategory = 'battle' | 'social' | 'content' | 'agent' | 'system'

export const NOTIFICATION_CATEGORY_MAP: Record<NotificationType, NotificationCategory> = {
  battle_result:         'battle',
  battle_started:        'battle',
  vote_reminder:         'battle',
  vote_received:         'battle',
  battle_assigned:       'battle',
  battle_vote_cast:      'battle',
  follow_new:            'social',
  follow_request:        'social',
  follow_accepted:       'social',
  lens_reaction:         'content',
  lens_comment:          'content',
  agent_update:          'agent',
  agent_cron_result:     'agent',
  agent_critical:        'agent',
  team_run_started:      'agent',
  team_run_completed:    'agent',
  team_run_failed:       'agent',
  cron_run_completed:    'agent',
  cron_run_failed:       'agent',
  policy_updated:        'agent',
  model_binding_changed: 'agent',
  requirement_update:    'agent',
  badge_awarded:         'system',
  system:                'system',
}

// ─── Legacy types (deprecated, kept for transition period) ───────────────────

/** @deprecated Use NotificationRow instead */
export interface Notification {
  id: string
  type: 'mention' | 'reaction' | 'comment' | 'system'
  title: string
  description?: string
  actor?: {
    name: string
    avatarUrl?: string
  }
  isRead: boolean
  createdAt: string
  link?: string
}

/** @deprecated Use NotificationRow instead */
export interface NotificationStats {
  unreadCount: number
}
