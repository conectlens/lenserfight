
import { getTagRepository } from '../adapters/tagAdapter';
import { TagUsage, TagDTO } from '../types/tags.types';
import { TagValidator } from '../domain/tags/TagValidator';
import { TagDomainError } from '../domain/tags/TagErrors';

const tagRepo = getTagRepository();

export const tagService = {
  
  /**
   * The Main Entry Point for User Input.
   * Orchestrates Validation, Normalization, and Persistence.
   */
  processUserInput: async (rawInput: string): Promise<TagDTO> => {
    // 1. Normalization
    const name = TagValidator.normalizeName(rawInput);
    const slug = TagValidator.generateSlug(name);

    // 2. Validation
    TagValidator.validateDisplayName(name);
    TagValidator.validateSlug(slug);

    // 3. Domain Logic: Find or Create
    // Check if tag exists
    const existingTag = await tagRepo.findBySlug(slug);
    if (existingTag) {
        return existingTag;
    }

    // Create new tag
    try {
        return await tagRepo.createTag(name, slug);
    } catch (e: any) {
        // Race condition handling: If DB constraints catch a duplicate slug that we missed
        if (e.message?.includes('duplicate key') || e.code === '23505') {
             const retry = await tagRepo.findBySlug(slug);
             if (retry) return retry;
        }
        throw new TagDomainError(`Failed to create tag: ${e.message}`);
    }
  },

  /**
   * Bulk process function for multiple tags (e.g. from a post creation form)
   */
  processBatchInput: async (rawInputs: string[]): Promise<TagDTO[]> => {
      if (!rawInputs.length) return [];
      
      const uniqueInputs = Array.from(new Set(rawInputs.filter(i => !!i?.trim())));
      const results: TagDTO[] = [];

      for (const input of uniqueInputs) {
          try {
              const tag = await tagService.processUserInput(input);
              results.push(tag);
          } catch (e) {
              console.warn(`Skipping invalid tag "${input}":`, e);
              // We skip invalid tags in batch rather than failing the whole batch
          }
      }
      return results;
  },

  // Read-only methods used by UI
  getCloud: async (): Promise<TagUsage[]> => {
    const tags = await tagRepo.getAllTagsWithCounts();
    if (tags.length === 0) return [];

    const values = tags.map(t => t.count);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const divisor = max - min === 0 ? 1 : max - min;

    return tags.map(tag => ({
      ...tag,
      weight: 1 + ((tag.count - min) / divisor) * 9
    })).sort((a, b) => b.count - a.count);
  },

  getTagDetails: async (slug: string): Promise<TagUsage | null> => {
      // In a real app, this would fetch extended metadata from Repo
      // For now, we reuse the list + filter, or specific find
      const dto = await tagRepo.findBySlug(slug);
      if (!dto) return null;
      
      // Enriched structure for UI
      return {
          ...dto,
          id: dto.id,
          count: 0, 
          trendingScore: 0,
          created_at: new Date().toISOString()
      };
  }
};
