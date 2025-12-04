
import { getTagRepository } from '../adapters/tagAdapter';
import { TagUsage, TagRecord } from '../types/tags.types';
import { TagNamingService } from './tagNamingService';

const tagRepo = getTagRepository();

export const tagService = {
  getCloud: async (): Promise<TagUsage[]> => {
    const tags = await tagRepo.getAllTagsWithCounts();
    
    if (tags.length === 0) return [];

    const useTrending = tags.some(t => t.trendingScore > 0);
    const getValue = (t: TagUsage) => useTrending ? t.trendingScore : t.count;

    const values = tags.map(getValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const divisor = max - min === 0 ? 1 : max - min;

    return tags.map(tag => {
      const val = getValue(tag);
      const weight = 1 + ((val - min) / divisor) * 9;
      return {
        ...tag,
        weight
      };
    }).sort((a, b) => b.trendingScore - a.trendingScore || b.count - a.count);
  },

  getTagDetails: async (slug: string): Promise<TagUsage | null> => {
      return tagRepo.getTagBySlug(slug);
  },

  upsertTags: async (names: string[]): Promise<TagRecord[]> => {
      if (!names || names.length === 0) return [];
      
      // Use TagNamingService to normalize and deduplicate by slug
      const slugMap = new Map<string, string>();
      names.forEach(n => {
          const { name, slug, isValid } = TagNamingService.normalize(n);
          if (isValid && !slugMap.has(slug)) {
              slugMap.set(slug, name);
          }
      });

      const uniqueNames = Array.from(slugMap.values());
      return tagRepo.upsertTags(uniqueNames);
  }
};
