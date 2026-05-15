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
  XPSeasonV2,
  SeasonLeaderboardEntry,
  XPStreak,
  XPLevelUp,
} from '@lenserfight/types'
import { createXPRepository } from '../factory'
import { XP_APP_IDS } from '../repositories/xpRepository'

export { XP_APP_IDS }

const repo = createXPRepository()

export const xpService = {
  getStats: async (lenserId: string, appId?: string): Promise<XPSummary | null> => {
    return repo.getXPSummary(lenserId, appId)
  },

  getHistory: async (lenserId: string, limit = 20): Promise<XPEvent[]> => {
    return repo.getHistory(lenserId, limit)
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

  getActiveSeason: async (appId: string = XP_APP_IDS.forum): Promise<XPSeason | null> => {
    return repo.getActiveSeason(appId)
  },

  getSeasonLeaderboard: async (
    appId: string = XP_APP_IDS.forum,
    seasonId?: string,
    limit = 20,
    offset = 0
  ): Promise<{ list: SeasonLeaderboardEntry[]; userEntry?: SeasonLeaderboardEntry | null }> => {
    return repo.getSeasonLeaderboard(appId, seasonId, limit, offset)
  },

  getStreak: async (lenserId: string, streakType = 'daily'): Promise<XPStreak | null> => {
    return repo.getStreak(lenserId, streakType)
  },

  getLevelUps: async (lenserId: string, limit = 20): Promise<XPLevelUp[]> => {
    return repo.getLevelUps(lenserId, limit)
  },

  getSeasonList: async (appId: string = XP_APP_IDS.forum): Promise<XPSeasonV2[]> => {
    return repo.getSeasonList(appId)
  },

  markTutorialComplete: async (
    tutorialSlug: string,
    kind: 'tutorial' | 'walkthrough' = 'tutorial'
  ): Promise<{ inserted: boolean; tutorialSlug: string; kind: string }> => {
    return repo.markTutorialComplete(tutorialSlug, kind)
  },
}
