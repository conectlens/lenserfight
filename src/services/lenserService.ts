
import { getLenserRepository } from '../adapters/lenserAdapter';
import { getShareRepository } from '../adapters/shareAdapter';
import { Lenser, CreateLenserDTO, LenserStats, LenserActivityPoint, ActionRecord, NetworkUser } from '../types/lenser.types';
import { PromptTemplateRecord } from '../types/prompts.types';
import { ThreadRecord } from '../types/threads.types';
import { shareService } from './shareService';

const lenserRepo = getLenserRepository();
const shareRepo = getShareRepository(); // Direct repo access for simple resolve

// Helper to enrich lenser profile with share link display name
const enrichLenserProfile = async (lenser: Lenser | null): Promise<Lenser | null> => {
    if (!lenser || !lenser.website_url) return lenser;

    // Check if website_url is a short link from this domain
    const appDomain = window.location.host;
    if (lenser.website_url.includes(appDomain) && lenser.website_url.includes('/s/')) {
        try {
            const parts = lenser.website_url.split('/s/');
            const shortId = parts[1];
            if (shortId) {
                const result = await shareRepo.resolveLink(shortId);
                if (result && result.link.display_name) {
                    return { ...lenser, website_display_name: result.link.display_name };
                }
            }
        } catch (e) {
            console.warn("Failed to resolve profile website link metadata", e);
        }
    }
    return lenser;
};

export const lenserService = {
  getLenserProfile: async (userId: string): Promise<Lenser | null> => {
    if (!userId) throw new Error("User ID is required");
    const lenser = await lenserRepo.getLenserByUserId(userId);
    return enrichLenserProfile(lenser);
  },

  createLenserProfile: async (userId: string, data: CreateLenserDTO): Promise<Lenser> => {
    if (!userId) throw new Error("User ID is required");
    return lenserRepo.createLenser(userId, data);
  },

  updateLenserProfile: async (userId: string, data: Partial<Lenser>): Promise<Lenser> => {
    if (!userId) throw new Error("User ID is required");

    // Intercept website URL to create a tracking link
    if (data.website_url) {
      let url = data.website_url.trim();
      
      // Ensure absolute URL
      if (!/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
      }

      // Check if it's already a tracking link from this domain to avoid infinite recursion
      const appDomain = window.location.host; 
      const isTrackingLink = url.includes(appDomain) && url.includes('/s/');

      if (!isTrackingLink && url.length > 0) {
          try {
              // Generate a tracking link
              // resourceId must be UUID for DB constraint, so we use random UUID and put real URL in meta
              // We store the original URL as displayName
              const link = await shareService.createLink({
                  resourceType: 'external',
                  resourceId: crypto.randomUUID(), 
                  displayName: url,
                  meta: { 
                      original_website: true,
                      targetUrl: url
                  }
              }, userId);
              
              data.website_url = shareService.getShareUrl(link.short_id);
          } catch (error) {
              console.warn("Failed to generate tracking link for profile website", error);
              // Fallback to absolute URL if shortening fails
              data.website_url = url; 
          }
      } else {
          // Normalize existing or untracked URL
          data.website_url = url;
      }
    }

    const updated = await lenserRepo.updateLenser(userId, data);
    // Return enriched version immediately if possible, or just updated
    return enrichLenserProfile(updated) as Promise<Lenser>;
  },

  getLenserByHandle: async (handle: string): Promise<Lenser | null> => {
    const lenser = await lenserRepo.getLenserByHandle(handle);
    return enrichLenserProfile(lenser);
  },

  getLenserStats: async (lenserId: string): Promise<LenserStats> => {
    return lenserRepo.getLenserStats(lenserId);
  },

  getLenserPrompts: async (lenserId: string, offset = 0, limit = 10, viewerId?: string): Promise<PromptTemplateRecord[]> => {
    return lenserRepo.getPromptsByLenser(lenserId, offset, limit, viewerId);
  },

  getLenserThreads: async (lenserId: string, offset = 0, limit = 10, viewerId?: string): Promise<ThreadRecord[]> => {
    return lenserRepo.getThreadsByLenser(lenserId, offset, limit, viewerId);
  },

  getLenserActivity: async (lenserId: string): Promise<LenserActivityPoint[]> => {
    return lenserRepo.getActivityTimeline(lenserId);
  },

  getRecentlyActiveLensers: async (limit: number = 5): Promise<Lenser[]> => {
      return lenserRepo.getRecentlyActive(limit);
  },

  getLatestJoinedLensers: async (limit: number = 5): Promise<Lenser[]> => {
      return lenserRepo.getLatestJoined(limit);
  },

  getLenserActions: async (lenserId: string): Promise<ActionRecord[]> => {
      return lenserRepo.getLenserActions(lenserId);
  },

  getLenserNetwork: async (lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]> => {
      return lenserRepo.getLenserNetwork(lenserId, type, page);
  }
};