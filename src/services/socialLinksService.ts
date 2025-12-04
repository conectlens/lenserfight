
import { getSocialLinksRepository } from '../adapters/socialLinksAdapter';
import { SocialLink, SocialPlatform } from '../types/lenser.types';

const repo = getSocialLinksRepository();

export const socialLinksService = {
  getLinks: async (lenserId: string): Promise<SocialLink[]> => {
    return repo.getLinks(lenserId);
  },

  syncLinks: async (lenserId: string, links: { id?: string, platform: SocialPlatform, url: string, label?: string | null }[]): Promise<SocialLink[]> => {
    // Validate
    const validLinks = links.map(link => {
      let url = link.url.trim();
      if (!url) throw new Error("URL cannot be empty");
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      return { ...link, url };
    });

    return repo.syncLinks(lenserId, validLinks);
  }
};
