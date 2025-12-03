import { getPromptsRepository } from '../adapters/promptsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { PromptTemplateViewModel, PromptTemplateDetailViewModel, PromptTemplateRecord, CreatePromptDTO } from '../types/prompts.types';

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
  getPrompts: async (): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.getAll();
    return Promise.all(records.map(enrichPrompt));
  },

  search: async (query: string): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.search(query);
    return Promise.all(records.map(enrichPrompt));
  },

  filter: async (tagSlug: string | null): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.filterByTag(tagSlug);
    return Promise.all(records.map(enrichPrompt));
  },

  sort: async (order: "newest" | "popular"): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.sort(order);
    return Promise.all(records.map(enrichPrompt));
  },

  getTopPrompts: async (limit: number = 3): Promise<PromptTemplateViewModel[]> => {
      const records = await promptsRepo.getTopPrompts(limit);
      return Promise.all(records.map(enrichPrompt));
  },

  getPromptDetail: async (id: string, viewerLenserId?: string): Promise<PromptTemplateDetailViewModel | null> => {
    const record = await promptsRepo.getById(id);
    if (!record) return null;

    const baseViewModel = await enrichPrompt(record);
    const reactions = await promptsRepo.getReactions(id);

    const reactionCounts = {
      like: reactions.filter(r => r.reaction === 'like').length,
      love: reactions.filter(r => r.reaction === 'love').length,
      clap: reactions.filter(r => r.reaction === 'clap').length,
      saved: reactions.filter(r => r.reaction === 'saved').length,
    };

    let isSaved = false;
    if (viewerLenserId) {
      isSaved = reactions.some(r => r.lenser_id === viewerLenserId && r.reaction === 'saved');
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

  savePrompt: async (id: string, lenserId: string): Promise<void> => {
    await promptsRepo.addReaction(id, lenserId, 'saved');
  },

  unsavePrompt: async (id: string, lenserId: string): Promise<void> => {
    await promptsRepo.removeReaction(id, lenserId, 'saved');
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

    return promptsRepo.createPrompt(input);
  }
};