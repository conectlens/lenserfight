
import { getPromptsRepository } from '../adapters/promptsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { getReactionRepository } from '../adapters/reactionAdapter';
import { reactionService } from './reactionService';
import { PromptTemplateViewModel, PromptTemplateDetailViewModel, PromptTemplateRecord, CreatePromptDTO, PromptAuthor } from '../types/prompts.types';
import { tagService } from './tagService';
import { tagActivityService } from './tagActivityService';
import { xpService } from './xpService';
import { contentModerationService } from './contentModerationService';

const promptsRepo = getPromptsRepository();
const lenserRepo = getLenserRepository();
const reactionRepo = getReactionRepository();

// Helper to resolve author from denormalized profile
const resolveAuthor = (record: any): PromptAuthor => {
    const profile = record.author_profile || {};
    return {
        id: profile.id || record.lenser_id || 'unknown',
        displayName: profile.display_name || 'Unknown',
        handle: profile.handle || 'unknown',
        avatarUrl: profile.avatar_url || null
    };
};

const mapToViewModels = async (records: any[], currentLenserId?: string): Promise<PromptTemplateViewModel[]> => {
    return records.map(record => {
        const tags = record.tags || []; // Use denormalized tags
        
        return {
            id: record.id,
            title: record.title,
            description: record.description,
            usageCount: record.reaction_totals?.['copy'] || 0,
            createdAt: record.created_at,
            visibility: record.visibility,
            author: resolveAuthor(record),
            tags: tags
        };
    });
};

export const promptsService = {
  getPrompts: async (offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.getAll(offset, limit);
    return mapToViewModels(records);
  },

  search: async (query: string, offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.search(query, offset, limit);
    return mapToViewModels(records);
  },

  filter: async (tagSlug: string | null, offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.filterByTag(tagSlug, offset, limit);
    return mapToViewModels(records);
  },

  sort: async (order: "newest" | "popular", offset = 0, limit = 10): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.sort(order, offset, limit);
    return mapToViewModels(records);
  },

  getTopPrompts: async (limit: number = 3): Promise<PromptTemplateViewModel[]> => {
      const records = await promptsRepo.getTopPrompts(limit);
      return mapToViewModels(records);
  },

  getLenserPrompts: async (lenserHandle: string, offset = 0, limit = 10, viewerId?: string): Promise<PromptTemplateViewModel[]> => {
    // If viewer is the owner, include private prompts.
    // We check via handle in repository or assume repo handles visibility.
    // Usually 'includePrivate' logic depends on matching ID. 
    // Here we pass the handle to repo, repo should check visibility.
    // For now, we will pass a flag based on if viewer is owner (requires resolving handle to ID or trusting frontend check?)
    // Actually repo signature handles `includePrivate`.
    // We need to know if `viewerId` corresponds to `lenserHandle`.
    
    // We'll let the repository filter by handle. The `includePrivate` check is tricky if we don't have the ID of `lenserHandle`.
    // But typically `viewerId` is the session user ID.
    // If we assume strict handle matching for ownership, we might need to fetch the profile first.
    // However, to keep it efficient, we might rely on the client to know if it's the owner (which it does).
    // Or we fetch public only for now unless we resolve ID.
    
    // Let's resolve ID briefly if we need strict private check, or simply pass viewerId and let repo handle logic if possible.
    // BUT the prompt requested fetching by handle.
    
    // For simplicity and performance, we'll try to resolve ownership if viewerId is present.
    let includePrivate = false;
    if (viewerId) {
        const viewer = await lenserRepo.getLenserById(viewerId);
        if (viewer && viewer.handle === lenserHandle) {
            includePrivate = true;
        }
    }

    const records = await promptsRepo.getByLenser(lenserHandle, offset, limit, includePrivate);
    return mapToViewModels(records);
  },

  getPromptDetail: async (id: string, viewerLenserId?: string): Promise<PromptTemplateDetailViewModel | null> => {
    const record: any = await promptsRepo.getById(id);
    if (!record) return null;

    if (record.visibility === 'private') {
        if (!viewerLenserId || record.lenser_id !== viewerLenserId) {
            throw new Error("401"); 
        }
    }

    const [viewModel] = await mapToViewModels([record], viewerLenserId);
    const summary = await reactionService.getReactionSummary('prompt_template', id, viewerLenserId);

    const reactionCounts = {
      like: summary.counts['like'] || 0,
      love: summary.counts['love'] || 0,
      clap: summary.counts['clap'] || 0,
      saved: summary.counts['saved'] || 0,
      copy: summary.counts['copy'] || 0,
    };

    const isSaved = summary.userReactions.includes('saved');

    return {
      ...viewModel,
      content: record.content,
      reactionCounts,
      isSaved
    };
  },

  getRelatedPrompts: async (id: string): Promise<PromptTemplateViewModel[]> => {
    const tags = await promptsRepo.getTags(id);
    if (tags.length === 0) {
        const all = await promptsRepo.getAll();
        return mapToViewModels(all.filter(p => p.id !== id).slice(0, 4));
    }

    const relatedRecords = await promptsRepo.filterByTag(tags[0].slug);
    const filtered = relatedRecords.filter(p => p.id !== id).slice(0, 5);
    return mapToViewModels(filtered);
  },

  copyPrompt: async (id: string, lenserId: string): Promise<void> => {
    await reactionService.recordReaction('prompt_template', id, lenserId, 'copy');
  },

  toggleSavePrompt: async (id: string, lenserId: string): Promise<boolean> => {
     // 1. Toggle reaction entry
     const { added, summary } = await reactionService.toggleReaction('prompt_template', id, lenserId, 'saved');
     
     // 2. Sync updated counts to reaction_totals JSONB column
     try {
         await promptsRepo.updateReactionTotals(id, summary.counts);
     } catch (e) {
         console.warn("Failed to sync reaction_totals", e);
     }

     return added;
  },

  toggleReaction: async (id: string, lenserId: string, reaction: 'like' | 'love' | 'clap') => {
      const { added, summary } = await reactionService.toggleReaction('prompt_template', id, lenserId, reaction);
      
      // XP Award
      if (added) {
          xpService.notifyReaction(lenserId, id).catch(console.error);
      }

      // Sync totals
      try {
          await promptsRepo.updateReactionTotals(id, summary.counts);
      } catch (e) {
          console.warn("Failed to sync reaction_totals", e);
      }

      return summary;
  },

  createPrompt: async (input: CreatePromptDTO): Promise<PromptTemplateRecord> => {
    if (!input.title || input.title.trim().length < 3) throw new Error("Title must be at least 3 characters long.");
    if (!input.content || input.content.trim().length < 10) throw new Error("Content must be at least 10 characters long.");
    if (!input.lenserId) throw new Error("User must be logged in with a profile to create a prompt.");

    if (!input.description) {
        input.description = input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '');
    }

    const resolvedTags = await tagService.processBatchInput(input.tagIds);
    const realTagIds = resolvedTags.map(t => t.id);

    const prompt = await promptsRepo.createPrompt({
        ...input,
        tagIds: realTagIds
    });

    // Batch logging for create
    tagActivityService.recordBatchActivity(
        realTagIds.map(tagId => ({
            tag_id: tagId,
            entity_type: 'prompt',
            entity_id: prompt.id,
            activity_type: 'created',
            actor_id: input.lenserId
        }))
    ).catch(console.error);

    // Award XP
    xpService.notifyPromptCreated(input.lenserId, prompt.id).catch(console.error);

    return prompt;
  },

  updatePrompt: async (id: string, input: Partial<CreatePromptDTO>, lenserId: string): Promise<PromptTemplateRecord> => {
      const existing = await promptsRepo.getById(id);
      if (!existing) throw new Error("Prompt not found");
      if (existing.lenser_id !== lenserId) throw new Error("Unauthorized to edit this prompt");

      if (input.content && !input.description) {
          input.description = input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '');
      }

      let realTagIds: string[] | undefined = undefined;
      if (input.tagIds) {
          const resolvedTags = await tagService.processBatchInput(input.tagIds);
          realTagIds = resolvedTags.map(t => t.id);
      }

      return promptsRepo.updatePrompt(id, { ...input, tagIds: realTagIds });
  },

  deletePrompt: async (id: string, lenserHandle: string): Promise<void> => {
      const existing = await promptsRepo.getById(id);
      if (!existing) throw new Error("Prompt not found");
      
      // Verify ownership by handle
      // Assuming existing record has author_profile JSONB populated
      const recordHandle = existing.author_profile?.handle || '';
      
      if (recordHandle !== lenserHandle) {
          throw new Error("Unauthorized to delete this prompt");
      }

      await promptsRepo.deletePrompt(id);
  },
  
  // Backward compatibility alias for deprecated method if needed elsewhere
  getAuthorPrompts: async (lenserHandle: string, offset = 0, limit = 10, viewerId?: string) => {
      return promptsService.getLenserPrompts(lenserHandle, offset, limit, viewerId);
  }
};
