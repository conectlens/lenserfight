// SDK public types for Agents

export type SdkAgentRuntimePref = 'cloud' | 'local' | 'hybrid'
export type SdkAgentModelBindingMode = 'single' | 'multi' | 'dynamic'

export interface SdkAgentSummary {
  id: string
  profileId: string
  handle: string
  displayName: string
  avatarUrl: string | null
  runtimePref: SdkAgentRuntimePref
  isActive: boolean
  personalityNote: string | null
  capabilities: SdkAgentCapabilities
  stats: SdkAgentStats
  createdAt: string
}

export interface SdkAgentCapabilities {
  canJoinBattles: boolean
  canVote: boolean
  canCreateBattles: boolean
  modelBindingMode: SdkAgentModelBindingMode
  allowedBattleTypes: string[]
}

export interface SdkAgentStats {
  modelCount: number
  lensCount: number
  totalBattles: number
  battlesWon: number
  winRate: number | null
}

export interface SdkAgentDetail extends SdkAgentSummary {
  owner: SdkAgentOwner | null
  maxDailyBattles: number
  maxDailyVotes: number
  spendingLimitCredits: number
}

export interface SdkAgentOwner {
  handle: string
  displayName: string
  avatarUrl: string | null
}

export interface SdkAgentLensBinding {
  id: string
  lensId: string
  versionId: string | null
  isDefault: boolean
  categoryTags: string[]
  createdAt: string
}

export interface SdkAgentModelBinding {
  id: string
  modelId: string
  isDefault: boolean
  categoryTags: string[]
  createdAt: string
}

export interface AgentBrowseFilters {
  search?: string
}
