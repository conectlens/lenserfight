import { getLenserRepository } from '../adapters/lenserAdapter';
import { Lenser, CreateLenserDTO, LenserStats, LenserActivityPoint, ActionRecord, NetworkUser } from '../types/lenser.types';
import { PromptTemplateRecord } from '../types/prompts.types';
import { ThreadRecord } from '../types/threads.types';

const lenserRepo = getLenserRepository();

export const lenserService = {
  getLenserProfile: async (userId: string): Promise<Lenser | null> => {
    if (!userId) throw new Error("User ID is required");
    return lenserRepo.getLenserByUserId(userId);
  },

  createLenserProfile: async (userId: string, data: CreateLenserDTO): Promise<Lenser> => {
    if (!userId) throw new Error("User ID is required");
    return lenserRepo.createLenser(userId, data);
  },

  updateLenserProfile: async (userId: string, data: Partial<Lenser>): Promise<Lenser> => {
    if (!userId) throw new Error("User ID is required");
    return lenserRepo.updateLenser(userId, data);
  },

  getLenserByHandle: async (handle: string): Promise<Lenser | null> => {
    return lenserRepo.getLenserByHandle(handle);
  },

  getLenserStats: async (lenserId: string): Promise<LenserStats> => {
    return lenserRepo.getLenserStats(lenserId);
  },

  getLenserPrompts: async (lenserId: string): Promise<PromptTemplateRecord[]> => {
    return lenserRepo.getPromptsByLenser(lenserId);
  },

  getLenserThreads: async (lenserId: string): Promise<ThreadRecord[]> => {
    return lenserRepo.getThreadsByLenser(lenserId);
  },

  getLenserActivity: async (lenserId: string): Promise<LenserActivityPoint[]> => {
    return lenserRepo.getActivityTimeline(lenserId);
  },

  getRecentlyActiveLensers: async (limit: number = 5): Promise<Lenser[]> => {
      return lenserRepo.getRecentlyActive(limit);
  },

  getLenserActions: async (lenserId: string): Promise<ActionRecord[]> => {
      return lenserRepo.getLenserActions(lenserId);
  },

  getLenserNetwork: async (lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]> => {
      return lenserRepo.getLenserNetwork(lenserId, type, page);
  }
};