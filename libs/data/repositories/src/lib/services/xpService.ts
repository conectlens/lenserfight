import {
  XPSummary,
  XPEvent,
  XPApp,
  XPContribution,
  LenserBadge,
  LeaderboardEntry,
  LeaderboardTimeframe,
  LeaderboardScope,
  XPSeason,
  SeasonLeaderboardEntry,
} from '@lenserfight/types'
import { createXPRepository } from '../factory'
import { XP_APP_IDS } from '../repositories/xpRepository'

export { XP_APP_IDS }

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

  getActiveSeason: async (appId = XP_APP_IDS.forum): Promise<XPSeason | null> => {
    return repo.getActiveSeason(appId)
  },

  getSeasonLeaderboard: async (
    appId = XP_APP_IDS.forum,
    seasonId?: string,
    limit = 20,
    offset = 0
  ): Promise<{ list: SeasonLeaderboardEntry[]; userEntry?: SeasonLeaderboardEntry | null }> => {
    return repo.getSeasonLeaderboard(appId, seasonId, limit, offset)
  },
}
