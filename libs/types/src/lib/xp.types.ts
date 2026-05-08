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

// Matches the rule_key in xp.rules table
export type XPRuleKey =
  // Forum
  | 'THREAD_CREATED'
  | 'THREAD_REPLY_CREATED'
  | 'THREAD_REPLY_RECEIVED'
  | 'PROMPT_CREATED'
  | 'TAG_CREATED'
  | 'REACTION_GIVEN'
  | 'REACTION_RECEIVED'
  | 'THREAD_ENGAGED'
  | 'DAILY_LOGIN'
  // Arena
  | 'BATTLE_CREATED'
  | 'BATTLE_PARTICIPATED'
  | 'BATTLE_WON'
  | 'BATTLE_VOTED'
  // CLI
  | 'CLI_INIT'
  | 'CLI_DEPLOY'
  // Auth
  | 'ACCOUNT_CREATED'
  | 'PROFILE_COMPLETED'
  // Contributor
  | 'CONTRIB_PR_MERGED_MAIN'
  | 'CONTRIB_PR_MERGED_COMMUNITY'
  | 'CONTRIB_PR_MERGED_DOCS'
  | 'CONTRIB_ISSUE_FILED'
  | 'CONTRIB_REVIEW_GIVEN'
  // Workflow Marketplace
  | 'WORKFLOW_FORKED'
  | 'WORKFLOW_FORK_RECEIVED'
  | 'WORKFLOW_LIKED'
  | 'WORKFLOW_LIKE_RECEIVED'
  | 'WORKFLOW_SAVED'
  | 'WORKFLOW_SAVE_RECEIVED'
  // Lens & Workflow Marketplace (existing DB rules missing from this type)
  | 'LENS_CREATED'
  | 'LENS_FORKED'
  | 'LENS_FORK_RECEIVED'
  | 'WORKFLOW_CREATED'
  | 'FOLLOW_RECEIVED'
  // Platform — Agents & Teams
  | 'AGENT_CREATED'
  | 'AGENT_TEAM_CREATED'
  // Platform — Local Devices & Runners
  | 'DEVICE_REGISTERED'
  | 'DEVICE_VERIFIED'
  | 'RUNNER_CONNECTED'
  // Platform — Referrals
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  // Platform — Content Publishing
  | 'WORKFLOW_PUBLISHED'
  | 'AGENT_USED_BY_OTHER_USER'
  // Battles — Execution Quality & Trust
  | 'BATTLE_SUBMISSION_COMPLETED'
  | 'VERIFIED_LOCAL_EXECUTION_COMPLETED'
  | 'BATTLE_RANKED_TOP_3'
  | 'BATTLE_RESULT_PUBLISHED'
  | 'FAIR_EVALUATION_COMPLETED'

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

export interface LeaderboardEntry {
  rank: number
  lenserId: string
  displayName: string
  handle?: string
  avatarUrl?: string
  totalXp: number
  level: number
  streak?: number // Days
  trend?: 'up' | 'down' | 'same'
}

export type LeaderboardTimeframe = 'weekly' | 'monthly' | 'all_time'
export type LeaderboardScope = 'global' | 'season'

export interface XPSeason {
  id: string
  slug: string
  name: string
  startsAt: string
  endsAt: string
  isActive: boolean
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
