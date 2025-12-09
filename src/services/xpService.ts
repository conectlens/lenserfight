
import { getXPRepository } from '../adapters/xpAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { XPRuleKey, XPSummary, XPEvent, LenserBadge, LeaderboardEntry, XPSource, LeaderboardTimeframe, LeaderboardScope } from '../types/xp.types';

const repo = getXPRepository();
const lenserRepo = getLenserRepository();
const APP_ID = '00000000-0000-0000-0000-000000000000'; 

export const xpService = {
  
  award: async (
    lenserId: string, 
    action: XPRuleKey, 
    ref?: { type: string, id: string },
    source: XPSource = 'content'
  ): Promise<XPSummary> => {
    if (!lenserId) throw new Error("User ID required for XP award");

    const lenser = await lenserRepo.getLenserById(lenserId);
    if (!lenser) {
        console.warn(`Cannot award XP: Lenser profile not found for user ${lenserId}`);
        throw new Error("Lenser profile not found");
    }

    return repo.grantXP({
      lenserHandle: lenser.handle,
      appId: APP_ID,
      ruleKey: action,
      source: source,
      refType: ref?.type,
      refId: ref?.id
    });
  },

  notifyThreadCreated: async (lenserId: string, threadId: string) => {
    return xpService.award(lenserId, 'THREAD_CREATED', { type: 'thread', id: threadId }, 'content');
  },

  notifyPromptCreated: async (lenserId: string, promptId: string) => {
    return xpService.award(lenserId, 'PROMPT_CREATED', { type: 'prompt_template', id: promptId }, 'content');
  },

  notifyReplyCreated: async (lenserId: string, replyId: string) => {
    return xpService.award(lenserId, 'THREAD_REPLY_CREATED', { type: 'thread_reply', id: replyId }, 'content');
  },

  notifyReaction: async (lenserId: string, targetId: string) => {
    return xpService.award(lenserId, 'REACTION_GIVEN', { type: 'unknown', id: targetId }, 'content');
  },

  notifyDailyLogin: async (lenserId: string) => {
    return xpService.award(lenserId, 'DAILY_LOGIN', null, 'system');
  },

  notifyThreadEngaged: async (lenserId: string, threadId: string) => {
    return xpService.award(lenserId, 'THREAD_ENGAGED', { type: 'thread', id: threadId }, 'content');
  },

  notifyThreadReplyReceived: async (lenserId: string, threadId: string) => {
    return xpService.award(lenserId, 'THREAD_REPLY_RECEIVED', { type: 'thread', id: threadId }, 'content');
  },

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
