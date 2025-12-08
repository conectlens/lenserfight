
import { getXPRepository } from '../adapters/xpAdapter';
import { XPRuleKey, XPSummary, XPEvent, LenserBadge, LeaderboardEntry, XPSource, LeaderboardTimeframe, LeaderboardScope } from '../types/xp.types';

const repo = getXPRepository();
const APP_ID = '00000000-0000-0000-0000-000000000000'; 

export const xpService = {
  getStats: async (lenserId: string): Promise<XPSummary | null> => {
    return repo.getXPSummary(lenserId);
  },

  getHistory: async (lenserId: string): Promise<XPEvent[]> => {
    return repo.getHistory(lenserId);
  },

  getBadges: async (lenserId: string): Promise<LenserBadge[]> => {
    return repo.getBadges(lenserId);
  },

  getLeaderboard: async (
    timeframe: LeaderboardTimeframe = 'all_time', 
    scope: LeaderboardScope = 'global', 
    limit = 50,
    offset = 0
  ): Promise<{ list: LeaderboardEntry[], userEntry?: LeaderboardEntry | null }> => {
    return repo.getLeaderboard(timeframe, scope, limit, offset);
  }
};
