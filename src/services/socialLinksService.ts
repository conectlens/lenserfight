
import { getSocialLinksRepository } from '../adapters/socialLinksAdapter';
import { SocialLink, SocialPlatform } from '../types/lenser.types';

const repo = getSocialLinksRepository();

export const socialLinksService = {
  getLinks: async (handle: string): Promise<SocialLink[]> => {
    return repo.getLinks(handle);
  },

  getLinksByHandle: async (handle: string): Promise<SocialLink[]> => {
    return repo.getLinksByHandle(handle);
  },

  syncLinks: async (handle: string, links: { id?: string, platform: SocialPlatform, url: string, label?: string | null }[]): Promise<SocialLink[]> => {
    // Validate
    const validLinks = links.map(link => {
      let url = link.url.trim();
      if (!url) throw new Error("URL cannot be empty");
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      return { ...link, url };
    });

    return repo.syncLinks(handle, validLinks);
  }
};
