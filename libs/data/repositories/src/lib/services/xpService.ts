import {
  XPSummary,
  XPEvent,
  XPApp,
  XPContribution,
  LenserBadge,
  LeaderboardEntry,
  LeaderboardTimeframe,
  LeaderboardScope,
} from '@lenserfight/types'
import { createXPRepository } from '../factory'


const repo = createXPRepository()

export const xpService = {
  getStats: async (lenserId: string, appId?: string): Promise<XPSummary | null> => {
    return repo.getXPSummary(lenserId, appId)
  },

  getHistory: async (lenserId: string): Promise<XPEvent[]> => {
    return repo.getHistory(lenserId)
  },

  getBadges: async (lenserId: string): Promise<LenserBadge[]> => {
    return repo.getBadges(lenserId)
  },

  getLeaderboard: async (
    timeframe: LeaderboardTimeframe = 'all_time',
    scope: LeaderboardScope = 'global',
    limit = 50,
    offset = 0
  ): Promise<{ list: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }> => {
    return repo.getLeaderboard(timeframe, scope, limit, offset)
  },

  getApps: async (): Promise<XPApp[]> => {
    return repo.getApps()
  },

  getContributions: async (lenserId: string): Promise<XPContribution[]> => {
    return repo.getContributions(lenserId)
  },
}
