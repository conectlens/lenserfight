export type XPSource =
  | 'system'
  | 'ai'
  | 'battle'
  | 'challenge'
  | 'daily'
  | 'referral'
  | 'social'
  | 'content'
  | 'contribution'
  | 'other'

export type XPDifficulty = 'easy' | 'standard' | 'hard' | 'legendary'

export type ContributionContext =
  | 'main_project'
  | 'community_plugin'
  | 'documentation'
  | 'infrastructure'

export type XPSeasonStatus = 'active' | 'upcoming' | 'ended'

// Matches the rule_key in xp.rules table
export type XPRuleKey =
  // Forum — content creation
  | 'LENS_CREATED'
  | 'THREAD_CREATED'
  | 'THREAD_REPLY_CREATED'
  | 'WORKFLOW_CREATED'
  | 'WORKFLOW_PUBLISHED'
  | 'PROMPT_CREATED'
  | 'TAG_CREATED'
  | 'MULTILINGUAL_CONTENT_CREATED'
  | 'GENERATIVE_MEDIA_CREATED'
  // Forum — social giving
  | 'REACTION_GIVEN'
  | 'WORKFLOW_LIKED'
  | 'WORKFLOW_SAVED'
  | 'WORKFLOW_FORKED'
  | 'LENS_FORKED'
  // Forum — social receiving
  | 'REACTION_RECEIVED'
  | 'THREAD_REPLY_RECEIVED'
  | 'WORKFLOW_LIKE_RECEIVED'
  | 'WORKFLOW_SAVE_RECEIVED'
  | 'WORKFLOW_FORK_RECEIVED'
  | 'LENS_FORK_RECEIVED'
  | 'WORKFLOW_RUN_RECEIVED'
  | 'FOLLOW_RECEIVED'
  // Forum — engagement
  | 'THREAD_ENGAGED'
  // Forum — daily activity & streaks
  | 'DAILY_LOGIN'
  | 'STREAK_BONUS_7D'
  | 'STREAK_BONUS_14D'
  | 'STREAK_BONUS_30D'
  // Forum — learning & challenges
  | 'TUTORIAL_COMPLETED'
  | 'WALKTHROUGH_COMPLETED'
  | 'CHALLENGE_COMPLETED'
  // Forum — platform milestones
  | 'ACCOUNT_CREATED'
  | 'PROFILE_COMPLETED'
  | 'CLI_INIT'
  | 'AGENT_CREATED'
  | 'AGENT_TEAM_CREATED'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  // Forum — open-source contributions
  | 'CONTRIB_PR_MERGED_MAIN'
  | 'CONTRIB_PR_MERGED_COMMUNITY'
  | 'CONTRIB_PR_MERGED_DOCS'
  | 'CONTRIB_ISSUE_FILED'
  | 'CONTRIB_REVIEW_GIVEN'
  // Battles — participation
  | 'BATTLE_CREATED'
  | 'BATTLE_JOINED'
  | 'BATTLE_PARTICIPATED'
  | 'BATTLE_WON'
  | 'BATTLE_VOTED'
  | 'BATTLE_RANKED_TOP_3'
  | 'BATTLE_RESULT_PUBLISHED'
  | 'BATTLE_SUBMISSION_COMPLETED'
  | 'FAIR_EVALUATION_COMPLETED'
  // Platform — local devices & runners
  | 'DEVICE_REGISTERED'
  | 'DEVICE_VERIFIED'
  | 'RUNNER_CONNECTED'
  | 'VERIFIED_LOCAL_EXECUTION_COMPLETED'
  // Platform — content publishing
  | 'WORKFLOW_PUBLISHED'
  | 'AGENT_USED_BY_OTHER_USER'

export interface XPApp {
  id: string
  slug: string
  name: string
  difficulty: XPDifficulty
  isActive: boolean
}

export interface XPSummary {
  totalXp: number
  currentLevel: number
  rank?: number
  currentLevelMinXp?: number
  currentLevelMaxXp?: number
}

export interface XPEvent {
  id: string
  action: string
  xp: number
  baseXp: number
  source: string
  createdAt: string
  /** Human-readable label derived from rule name */
  label?: string
  /** Whether this event is frozen (moderated content) */
  frozen?: boolean
}

export interface XPContribution {
  id: string
  lenserId: string
  context: ContributionContext
  contributionType: string
  externalRef?: string
  title?: string
  verifiedBy?: string
  xpEventId?: string
  createdAt: string
}

export interface LenserBadge {
  id: string
  type: string
  label: string
  description?: string
  icon?: string
  awardedAt: string
}

export interface XPStreak {
  lenserId: string
  streakType: string
  currentStreak: number
  bestStreak: number
  lastUpdateAt: string
}

export interface XPLevelUp {
  id: string
  oldLevel: number
  newLevel: number
  totalXpAt: number
  createdAt: string
}

export interface LeaderboardEntry {
  rank: number
  lenserId: string
  displayName: string
  handle?: string
  avatarUrl?: string
  totalXp: number
  level: number
  streak?: number
  trend?: 'up' | 'down' | 'same'
}

export type LeaderboardTimeframe = 'weekly' | 'monthly' | 'all_time'
export type LeaderboardScope = 'global' | 'season'

export interface FeaturedChallenge {
  title: string
  description: string
  xpReward: number
  ruleKey: XPRuleKey
}

export interface XPSeason {
  id: string
  slug: string
  name: string
  startsAt: string
  endsAt: string
  isActive: boolean
}

export interface XPSeasonV2 extends XPSeason {
  description?: string
  rewardDescription?: string
  featuredChallenges: FeaturedChallenge[]
  status: XPSeasonStatus
}

export interface SeasonLeaderboardEntry {
  seasonId: string
  seasonSlug: string
  appId: string
  rank: number
  lenserId: string
  totalXp: number
  user: {
    displayName: string
    handle?: string
    avatarUrl?: string
  }
}

// XP rule display metadata (derived client-side from action key)
export const XP_RULE_LABELS: Partial<Record<XPRuleKey, string>> = {
  LENS_CREATED: 'Lens Published',
  THREAD_CREATED: 'Thread Posted',
  THREAD_REPLY_CREATED: 'Reply Posted',
  WORKFLOW_CREATED: 'Workflow Created',
  WORKFLOW_PUBLISHED: 'Workflow Published',
  PROMPT_CREATED: 'Prompt Created',
  MULTILINGUAL_CONTENT_CREATED: 'Multilingual Content',
  GENERATIVE_MEDIA_CREATED: 'Generative Media',
  REACTION_GIVEN: 'Reaction Given',
  WORKFLOW_LIKED: 'Workflow Liked',
  WORKFLOW_SAVED: 'Workflow Saved',
  WORKFLOW_FORKED: 'Workflow Forked',
  LENS_FORKED: 'Lens Forked',
  REACTION_RECEIVED: 'Reaction Received',
  THREAD_REPLY_RECEIVED: 'Reply Received',
  WORKFLOW_LIKE_RECEIVED: 'Workflow Like',
  WORKFLOW_SAVE_RECEIVED: 'Workflow Saved by Others',
  WORKFLOW_FORK_RECEIVED: 'Workflow Fork',
  LENS_FORK_RECEIVED: 'Lens Fork',
  WORKFLOW_RUN_RECEIVED: 'Workflow Run',
  FOLLOW_RECEIVED: 'New Follower',
  DAILY_LOGIN: 'Daily Login',
  STREAK_BONUS_7D: '7-Day Streak',
  STREAK_BONUS_14D: '14-Day Streak',
  STREAK_BONUS_30D: '30-Day Streak',
  TUTORIAL_COMPLETED: 'Tutorial Completed',
  WALKTHROUGH_COMPLETED: 'Walkthrough Completed',
  CHALLENGE_COMPLETED: 'Season Challenge',
  ACCOUNT_CREATED: 'Account Created',
  PROFILE_COMPLETED: 'Profile Setup',
  CLI_INIT: 'CLI Setup',
  AGENT_CREATED: 'Agent Created',
  INVITE_SENT: 'Invite Sent',
  INVITE_ACCEPTED: 'Friend Joined',
  CONTRIB_PR_MERGED_MAIN: 'Core PR Merged',
  CONTRIB_PR_MERGED_COMMUNITY: 'Community PR',
  CONTRIB_PR_MERGED_DOCS: 'Docs PR',
  CONTRIB_ISSUE_FILED: 'Issue Filed',
  CONTRIB_REVIEW_GIVEN: 'Code Review',
  BATTLE_CREATED: 'Battle Created',
  BATTLE_JOINED: 'Battle Joined',
  BATTLE_PARTICIPATED: 'Battle Participated',
  BATTLE_WON: 'Battle Won',
  BATTLE_VOTED: 'Vote Cast',
  BATTLE_RANKED_TOP_3: 'Top 3 Finish',
  BATTLE_RESULT_PUBLISHED: 'Result Published',
  DEVICE_REGISTERED: 'Device Connected',
  DEVICE_VERIFIED: 'Device Verified',
  RUNNER_CONNECTED: 'Runner Connected',
}
