// ─── Notification type strings ────────────────────────────────────────────────
// Single source of truth for the discriminant. Must stay in sync with the SQL
// CHECK constraint in public.notifications (migration 20271209000000).

export type NotificationType =
  // Battle (shared human + AI)
  | 'battle_result'
  | 'battle_started'
  | 'vote_reminder'
  // Battle (Phase BF — template-sourced battles)
  | 'template_battle_open'
  | 'template_battle_published'
  // Battle (human-specific)
  | 'vote_received'
  // Battle (AI lenser-specific)
  | 'battle_assigned'
  | 'battle_vote_cast'
  // Battle (Phase CN — differentiated outcomes + social)
  | 'battle_joined'
  | 'battle_won'
  | 'battle_lost'
  | 'battle_comment'
  // Social (human)
  | 'follow_new'
  | 'follow_request'
  | 'follow_accepted'
  // Content (human)
  | 'lens_reaction'
  | 'lens_comment'
  // Content (Phase CN — lens/workflow lifecycle)
  | 'lens_published'
  | 'lens_forked'
  | 'lens_featured'
  | 'lens_milestone'
  | 'workflow_published'
  | 'workflow_forked'
  // Agent ownership (human owner of AI lenser)
  | 'agent_update'
  | 'agent_cron_result'
  | 'agent_critical'
  // Agent (Phase CN — lifecycle)
  | 'agent_created'
  | 'agent_battle_won'
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
  | 'leaderboard_change'
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

// ─── Phase CN metadata interfaces ────────────────────────────────────────────

export interface LensPublishedMetadata {
  author_id: string
  author_handle: string
  lens_id: string
  lens_title: string | null
  visibility: 'public' | 'community'
}

export interface LensForkedMetadata {
  forker_id: string
  forker_handle: string
  forker_display_name: string | null
  parent_lens_id: string
  fork_lens_id: string
}

export interface LensFeaturedMetadata {
  lens_id: string
}

export interface LensMilestoneMetadata {
  lens_id: string
  milestone: number
  metric: 'copy' | 'reaction'
}

export interface WorkflowPublishedMetadata {
  author_id: string
  author_handle: string
  workflow_id: string
  workflow_title: string
}

export interface WorkflowForkedMetadata {
  forker_id: string
  forker_handle: string
  forker_display_name: string | null
  parent_workflow_id: string
  fork_workflow_id: string
  fork_title: string
}

export interface BattleJoinedMetadata {
  battle_id: string
  battle_slug: string
  contender_id: string
  joiner_id: string
  joiner_handle: string
  joiner_display_name: string | null
}

export interface BattleWonMetadata {
  battle_id: string
  battle_slug: string
  contender_id: string
  winner_id: string
  winner_name: string | null
  is_winner: true
}

export interface BattleLostMetadata {
  battle_id: string
  battle_slug: string
  contender_id: string
  winner_id: string | null
  winner_name: string | null
  is_winner: false
}

export interface BattleCommentMetadata {
  commenter_id: string
  commenter_handle: string
  commenter_display_name: string | null
  battle_id: string
  battle_slug: string
  preview: string
}

export interface AgentCreatedMetadata {
  ai_lenser_id: string
  ai_profile_id: string | null
  ai_handle: string | null
}

export interface AgentBattleWonMetadata {
  ai_lenser_id: string
  battle_id: string
  battle_slug: string
  battle_title: string
}

export interface LeaderboardChangeMetadata {
  previous_rank: number
  new_rank: number
  delta: number
}

// ─── Notification preferences row (fn_get_notification_preferences return) ───

export interface NotificationPreference {
  notification_type: NotificationType
  enabled: boolean
  updated_at: string
}

// ─── Discriminated union (Polymorphism) ───────────────────────────────────────

export type NotificationPayload =
  | { type: 'battle_result';         metadata: BattleResultMetadata }
  | { type: 'battle_started';        metadata: BattleStartedMetadata }
  | { type: 'vote_reminder';         metadata: VoteReminderMetadata }
  | { type: 'template_battle_open';        metadata: SystemMetadata }
  | { type: 'template_battle_published';   metadata: SystemMetadata }
  | { type: 'vote_received';         metadata: VoteReceivedMetadata }
  | { type: 'battle_assigned';       metadata: BattleAssignedMetadata }
  | { type: 'battle_vote_cast';      metadata: BattleVoteCastMetadata }
  | { type: 'battle_joined';         metadata: BattleJoinedMetadata }
  | { type: 'battle_won';            metadata: BattleWonMetadata }
  | { type: 'battle_lost';           metadata: BattleLostMetadata }
  | { type: 'battle_comment';        metadata: BattleCommentMetadata }
  | { type: 'follow_new';            metadata: FollowNewMetadata }
  | { type: 'follow_request';        metadata: FollowRequestMetadata }
  | { type: 'follow_accepted';       metadata: FollowAcceptedMetadata }
  | { type: 'lens_reaction';         metadata: LensReactionMetadata }
  | { type: 'lens_comment';          metadata: LensCommentMetadata }
  | { type: 'lens_published';        metadata: LensPublishedMetadata }
  | { type: 'lens_forked';           metadata: LensForkedMetadata }
  | { type: 'lens_featured';         metadata: LensFeaturedMetadata }
  | { type: 'lens_milestone';        metadata: LensMilestoneMetadata }
  | { type: 'workflow_published';    metadata: WorkflowPublishedMetadata }
  | { type: 'workflow_forked';       metadata: WorkflowForkedMetadata }
  | { type: 'agent_update';          metadata: AgentUpdateMetadata }
  | { type: 'agent_cron_result';     metadata: AgentCronResultMetadata }
  | { type: 'agent_critical';        metadata: AgentCriticalMetadata }
  | { type: 'agent_created';         metadata: AgentCreatedMetadata }
  | { type: 'agent_battle_won';      metadata: AgentBattleWonMetadata }
  | { type: 'team_run_started';      metadata: TeamRunMetadata }
  | { type: 'team_run_completed';    metadata: TeamRunMetadata }
  | { type: 'team_run_failed';       metadata: TeamRunMetadata }
  | { type: 'cron_run_completed';    metadata: CronRunMetadata }
  | { type: 'cron_run_failed';       metadata: CronRunMetadata }
  | { type: 'policy_updated';        metadata: PolicyUpdatedMetadata }
  | { type: 'model_binding_changed'; metadata: ModelBindingChangedMetadata }
  | { type: 'requirement_update';    metadata: RequirementUpdateMetadata }
  | { type: 'badge_awarded';         metadata: BadgeAwardedMetadata }
  | { type: 'leaderboard_change';    metadata: LeaderboardChangeMetadata }
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
  battle_result:             'battle',
  battle_started:            'battle',
  vote_reminder:             'battle',
  template_battle_open:      'battle',
  template_battle_published: 'battle',
  vote_received:             'battle',
  battle_assigned:           'battle',
  battle_vote_cast:          'battle',
  battle_joined:             'battle',
  battle_won:                'battle',
  battle_lost:               'battle',
  battle_comment:            'battle',
  follow_new:                'social',
  follow_request:            'social',
  follow_accepted:           'social',
  lens_reaction:             'content',
  lens_comment:              'content',
  lens_published:            'content',
  lens_forked:               'content',
  lens_featured:             'content',
  lens_milestone:            'content',
  workflow_published:        'content',
  workflow_forked:           'content',
  agent_update:              'agent',
  agent_cron_result:         'agent',
  agent_critical:            'agent',
  agent_created:             'agent',
  agent_battle_won:          'agent',
  team_run_started:          'agent',
  team_run_completed:        'agent',
  team_run_failed:           'agent',
  cron_run_completed:        'agent',
  cron_run_failed:           'agent',
  policy_updated:            'agent',
  model_binding_changed:     'agent',
  requirement_update:        'agent',
  badge_awarded:             'system',
  leaderboard_change:        'system',
  system:                    'system',
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
