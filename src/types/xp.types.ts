
export type XPSource = 'system' | 'ai' | 'battle' | 'challenge' | 'daily' | 'social' | 'content';

// Matches the rule_key in xp_rules table
export type XPRuleKey = 
  | 'THREAD_CREATED'
  | 'THREAD_REPLY_CREATED'
  | 'PROMPT_CREATED'
  | 'REACTION_GIVEN'
  | 'DAILY_LOGIN'
  | 'THREAD_ENGAGED'
  | 'THREAD_REPLY_RECEIVED';

export interface XPSummary {
  totalXp: number;
  currentLevel: number;
  rank?: number;
  currentLevelMinXp?: number;
  currentLevelMaxXp?: number;
}

export interface XPEvent {
  id: string;
  action: string;
  xp: number;
  source: string;
  createdAt: string;
}

export interface LenserBadge {
  id: string;
  type: string;
  label: string;
  description?: string;
  icon?: string;
  awardedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  lenserId: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  totalXp: number;
  level: number;
  streak?: number; // Days
  trend?: 'up' | 'down' | 'same';
}

export type LeaderboardTimeframe = 'weekly' | 'monthly' | 'all_time';
export type LeaderboardScope = 'global' | 'season';

export interface GrantXPDTO {
  ruleKey: XPRuleKey;
  source: XPSource;
  lenserId: string;
  appId: string; // Usually fixed per deployment
  refType?: string;
  refId?: string;
}
