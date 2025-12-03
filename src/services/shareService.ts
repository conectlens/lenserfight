import { getShareRepository } from '../adapters/shareAdapter';
import { CreateLinkDTO, SharedLink } from '../types/share.types';

const shareRepo = getShareRepository();

export const shareService = {
  createLink: async (dto: CreateLinkDTO, creatorLenserId: string): Promise<SharedLink> => {
    if (!creatorLenserId) throw new Error("User must be identified to create share links.");
    return shareRepo.createLink(dto, creatorLenserId);
  },

  /**
   * Generates a full URL for the short link.
   * In Mock mode, it uses window.location.origin + /#/s/ + shortId.
   * In Prod, it would be https://lenserfight.com/s/ + shortId.
   */
  getShareUrl: (shortId: string): string => {
    const origin = window.location.origin;
    // Check if we are in HashRouter mode (Mock usually is)
    const isHashRouter = window.location.hash.includes('#');
    
    if (isHashRouter) {
        return `${origin}/#/s/${shortId}`;
    }
    // Production Edge Function URL assumption
    return `${origin}/s/${shortId}`;
  },

  resolveAndLog: async (shortId: string, viewerLenserId?: string) => {
      const result = await shareRepo.resolveLink(shortId);
      if (result) {
          // Fire and forget logging
          shareRepo.logEvent(shortId, 'opened', { viewer_lenser_id: viewerLenserId });
      }
      return result;
  }
};
