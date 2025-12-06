
import { getXPRepository } from '../adapters/xpAdapter';
import { XPRuleKey, XPSummary, XPEvent, LenserBadge, LeaderboardEntry, XPSource } from '../types/xp.types';

const repo = getXPRepository();
// APP_ID constant would typically come from environment variables
const APP_ID = '00000000-0000-0000-0000-000000000000'; 

export const xpService = {
  
  /**
   * Main entry point for awarding XP from the client side.
   * Maps high-level actions to RPC rule keys.
   */
  award: async (
    lenserId: string, 
    action: XPRuleKey, 
    ref?: { type: string, id: string },
    source: XPSource = 'content'
  ): Promise<XPSummary> => {
    if (!lenserId) throw new Error("User ID required for XP award");

    return repo.grantXP({
      lenserId,
      appId: APP_ID,
      ruleKey: action,
      source: source,
      refType: ref?.type,
      refId: ref?.id
    });
  },

  /**
   * Hook for when a thread is created.
   */
  notifyThreadCreated: async (lenserId: string, threadId: string) => {
    return xpService.award(lenserId, 'THREAD_CREATED', { type: 'thread', id: threadId }, 'content');
  },

  /**
   * Hook for when a prompt is created.
   */
  notifyPromptCreated: async (lenserId: string, promptId: string) => {
    return xpService.award(lenserId, 'PROMPT_CREATED', { type: 'prompt_template', id: promptId }, 'content');
  },

  /**
   * Hook for when a reply is created.
   */
  notifyReplyCreated: async (lenserId: string, replyId: string) => {
    return xpService.award(lenserId, 'THREAD_REPLY_CREATED', { type: 'thread_reply', id: replyId }, 'content');
  },

  /**
   * Hook for interaction (like).
   */
  notifyReaction: async (lenserId: string, targetId: string) => {
    // We might want to debounce this or limit it on the client, 
    // but the DB rules also enforce rate limits.
    return xpService.award(lenserId, 'REACTION_GIVEN', { type: 'unknown', id: targetId }, 'content');
  },

  /**
   * Hook for daily login.
   */
 notifyDailyLogin: async (lenserId: string) => {
  return xpService.award(lenserId, 'DAILY_LOGIN', null, 'system');
},

  /**
   * Hook for thread engagement (view).
   */
  notifyThreadEngaged: async (lenserId: string, threadId: string) => {
    return xpService.award(lenserId, 'THREAD_ENGAGED', { type: 'thread', id: threadId }, 'content');
  },

  /**
   * Hook for thread owner bonus when reply received.
   */
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

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    return repo.getGlobalLeaderboard();
  }
};
