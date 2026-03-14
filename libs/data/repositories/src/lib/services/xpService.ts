import { SupabaseLenserRepository } from '../repositories/lenserRepository'
import { SupabaseXPRepository } from '../repositories/xpRepository'
import {
  XPSummary,
  XPEvent,
  LenserBadge,
  LeaderboardEntry,
  LeaderboardTimeframe,
  LeaderboardScope,
} from '@lenserfight/types'

const repo = new SupabaseXPRepository()
const lenserRepo = new SupabaseLenserRepository()

export const xpService = {
  getStats: async (lenserId: string): Promise<XPSummary | null> => {
    return repo.getXPSummary(lenserId)
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
}
