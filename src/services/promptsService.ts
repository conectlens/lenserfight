
import { getPromptsRepository } from '../adapters/promptsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { reactionService } from './reactionService';
import { PromptTemplateViewModel, PromptTemplateDetailViewModel, PromptTemplateRecord, CreatePromptDTO } from '../types/prompts.types';
import { tagService } from './tagService';
import { tagActivityService } from './tagActivityService';

const promptsRepo = getPromptsRepository();
const lenserRepo = getLenserRepository();

const enrichPrompt = async (prompt: PromptTemplateRecord): Promise<PromptTemplateViewModel> => {
  const [author, tags] = await Promise.all([
    lenserRepo.getLenserById(prompt.lenser_id),
    promptsRepo.getTags(prompt.id)
  ]);

  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    usageCount: prompt.usage_count,
    createdAt: prompt.created_at,
    visibility: prompt.visibility,
    author: {
      id: author?.id || 'unknown',
      displayName: author?.display_name || 'Unknown',
      handle: author?.handle || 'unknown',
      avatarUrl: author?.avatar_url
    },
    tags: tags
  };
};

export const promptsService = {
  getPrompts: async (currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.getAll(currentLenserId, offset, limit);
    return Promise.all(records.map(enrichPrompt));
  },

  search: async (query: string, currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.search(query, currentLenserId, offset, limit);
    return Promise.all(records.map(enrichPrompt));
  },

  filter: async (tagSlug: string | null, currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.filterByTag(tagSlug, currentLenserId, offset, limit);
    return Promise.all(records.map(enrichPrompt));
  },

  sort: async (order: "newest" | "popular", currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.sort(order, currentLenserId, offset, limit);
    return Promise.all(records.map(enrichPrompt));
  },

  getTopPrompts: async (limit: number = 3): Promise<PromptTemplateViewModel[]> => {
      const records = await promptsRepo.getTopPrompts(limit);
      return Promise.all(records.map(enrichPrompt));
  },

  getAuthorPrompts: async (lenserId: string): Promise<PromptTemplateViewModel[]> => {
    const records = await lenserRepo.getPromptsByLenser(lenserId);
    return Promise.all(records.map(enrichPrompt));
  },

  getPromptDetail: async (id: string, viewerLenserId?: string): Promise<PromptTemplateDetailViewModel | null> => {
    const record = await promptsRepo.getById(id);
    if (!record) return null;

    // Access Control Check for Private Prompts
    if (record.visibility === 'private' && record.lenser_id !== viewerLenserId) {
        throw new Error("401"); // Unauthorized
    }

    const baseViewModel = await enrichPrompt(record);
    const summary = await reactionService.getReactionSummary('prompt_template', id, viewerLenserId);

    const reactionCounts = {
      like: summary.counts['like'] || 0,
      love: summary.counts['love'] || 0,
      clap: summary.counts['clap'] || 0,
      saved: summary.counts['saved'] || 0,
    };

    const isSaved = summary.userReactions.includes('saved');

    // Record View Activity for Tags
    if (baseViewModel.tags.length > 0) {
        Promise.all(baseViewModel.tags.map(t => 
            tagActivityService.recordView(t.id, 'prompt', id, viewerLenserId)
        )).catch(() => {});
    }

    return {
      ...baseViewModel,
      content: record.content,
      reactionCounts,
      isSaved
    };
  },

  getRelatedPrompts: async (id: string): Promise<PromptTemplateViewModel[]> => {
    const currentTags = await promptsRepo.getTags(id);
    if (currentTags.length === 0) {
        const all = await promptsRepo.getAll();
        return Promise.all(all.filter(p => p.id !== id).slice(0, 4).map(enrichPrompt));
    }

    const relatedRecords = await promptsRepo.filterByTag(currentTags[0].slug);
    const filtered = relatedRecords.filter(p => p.id !== id).slice(0, 5);
    return Promise.all(filtered.map(enrichPrompt));
  },

  copyPrompt: async (id: string, lenserId: string): Promise<void> => {
    await promptsRepo.createUsageEvent(id, 'copied', lenserId);
  },

  toggleSavePrompt: async (id: string, lenserId: string): Promise<boolean> => {
     // 'saved' is handled as a reaction in the new system
     const result = await reactionService.toggleReaction('prompt_template', id, lenserId, 'saved');
     return result.added;
  },

  toggleReaction: async (id: string, lenserId: string, reaction: 'like' | 'love' | 'clap') => {
      const result = await reactionService.toggleReaction('prompt_template', id, lenserId, reaction);
      return result.summary;
  },

  createPrompt: async (input: CreatePromptDTO): Promise<PromptTemplateRecord> => {
    if (!input.title || input.title.trim().length < 3) {
      throw new Error("Title must be at least 3 characters long.");
    }
    if (!input.content || input.content.trim().length < 10) {
      throw new Error("Content must be at least 10 characters long.");
    }
    if (!input.lenserId) {
      throw new Error("User must be logged in with a profile to create a prompt.");
    }

    if (!input.description) {
        input.description = input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '');
    }

    // 1. Resolve Tag Names to IDs
    const resolvedTags = await tagService.upsertTags(input.tagIds);
    const realTagIds = resolvedTags.map(t => t.id);

    // 2. Create Prompt
    const prompt = await promptsRepo.createPrompt({
        ...input,
        tagIds: realTagIds
    });

    // 3. Record Activity
    Promise.all(realTagIds.map(tagId => 
        tagActivityService.recordActivity(tagId, 'prompt', prompt.id, input.lenserId, 'created')
    )).catch(console.error);

    return prompt;
  },

  updatePrompt: async (id: string, input: Partial<CreatePromptDTO>, lenserId: string): Promise<PromptTemplateRecord> => {
      const existing = await promptsRepo.getById(id);
      if (!existing) throw new Error("Prompt not found");
      if (existing.lenser_id !== lenserId) throw new Error("Unauthorized to edit this prompt");

      let realTagIds: string[] | undefined = undefined;
      if (input.tagIds) {
          const resolvedTags = await tagService.upsertTags(input.tagIds);
          realTagIds = resolvedTags.map(t => t.id);
      }

      if (input.content && !input.description) {
          input.description = input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '');
      }

      return promptsRepo.updatePrompt(id, { ...input, tagIds: realTagIds });
  },

  deletePrompt: async (id: string, lenserId: string): Promise<void> => {
      const existing = await promptsRepo.getById(id);
      if (!existing) throw new Error("Prompt not found");
      if (existing.lenser_id !== lenserId) throw new Error("Unauthorized to delete this prompt");

      await promptsRepo.deletePrompt(id);
  }
};
