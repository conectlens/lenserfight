import { SupabaseLenserRepository } from '../repositories/lenserRepository'
import { SupabasePromptsRepository } from '../repositories/promptsRepository'
import { SupabaseReactionRepository } from '../repositories/reactionRepository'
import {
  PromptTemplateViewModel,
  PromptTemplateDetailViewModel,
  PromptTemplateRecord,
  PersonalPromptFeedItem,
  CreatePromptDTO,
  PromptAuthor,
} from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

import { reactionService } from './reactionService'
import { tagService } from './tagService'

const promptsRepo = new SupabasePromptsRepository()
const lenserRepo = new SupabaseLenserRepository()
const reactionRepo = new SupabaseReactionRepository()

// Helper to resolve author from denormalized profile
const resolveAuthor = (record: any): PromptAuthor => {
  const profile = record.author_profile || {}
  return {
    id: profile.id || record.lenser_id || 'unknown',
    displayName: profile.display_name || 'Unknown',
    handle: profile.handle || 'unknown',
    avatarUrl: profile.avatar_url || null,
  }
}

const mapToViewModels = async (
  records: any[],
  currentLenserId?: string
): Promise<PromptTemplateViewModel[]> => {
  return records.map((record) => {
    const tags = record.tags || [] // Use denormalized tags

    return {
      id: record.id,
      title: record.title,
      description: record.description,
      usageCount: record.reaction_totals?.['copy'] || 0,
      createdAt: record.created_at,
      visibility: record.visibility,
      status: record.status,
      author: resolveAuthor(record),
      tags: tags,
    }
  })
}

export const promptsService = {
  getPrompts: async (offset = 0, limit = 10): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>> => {
    const result = await promptsRepo.getAll(offset, limit)
    const items = await mapToViewModels(result.data ?? [])
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  search: async (query: string, offset = 0, limit = 10): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>> => {
    const result = await promptsRepo.search(query, offset, limit)
    const items = await mapToViewModels(result.data ?? [])
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  filter: async (
    tagSlug: string | null,
    offset = 0,
    limit = 10
  ): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>> => {
    const result = await promptsRepo.filterByTag(tagSlug, offset, limit)
    const items = await mapToViewModels(result.data ?? [])
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  sort: async (
    order: 'newest' | 'popular',
    offset = 0,
    limit = 10
  ): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>> => {
    const result = await promptsRepo.sort(order, offset, limit)
    const items = await mapToViewModels(result.data ?? [])
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  getTopPrompts: async (limit: number = 3): Promise<PromptTemplateViewModel[]> => {
    const records = await promptsRepo.getTopPrompts(limit)
    return mapToViewModels(records)
  },

  getTrending: async (
    lang?: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>> => {
    return promptsRepo.getTrendingPrompts(lang, offset, limit)
  },

  getPersonalFeed: async (
    _lenserId: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<PersonalPromptFeedItem[]>> => {
    return promptsRepo.getPersonalFeed(offset, limit)
  },

  getLenserPrompts: async (
    lenserHandle: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<PromptTemplateViewModel[]> => {
    let includePrivate = false
    if (viewerId) {
      const viewer = await lenserRepo.getLenserById(viewerId)
      if (viewer && viewer.handle === lenserHandle) {
        includePrivate = true
      }
    }

    const records = await promptsRepo.getByLenser(lenserHandle, offset, limit, includePrivate)
    return mapToViewModels(records)
  },

  getPromptDetail: async (
    id: string,
    viewerLenserId?: string
  ): Promise<PromptTemplateDetailViewModel | null> => {
    const record: any = await promptsRepo.getById(id, viewerLenserId)
    if (!record) return null

    if (record.visibility === 'private') {
      if (!viewerLenserId || record.lenser_id !== viewerLenserId) {
        throw new Error('401')
      }
    }

    const [viewModel] = await mapToViewModels([record], viewerLenserId)
    const summary = await reactionService.getReactionSummary('prompt_template', id, viewerLenserId)

    const reactionCounts = {
      like: summary.counts['like'] || 0,
      love: summary.counts['love'] || 0,
      clap: summary.counts['clap'] || 0,
      saved: summary.counts['saved'] || 0,
      copy: summary.counts['copy'] || 0,
    }

    const isSaved = summary.userReactions.includes('saved')

    return {
      ...viewModel,
      content: record.content,
      reactionCounts,
      isSaved,
    }
  },

  getRelatedPrompts: async (id: string): Promise<PromptTemplateViewModel[]> => {
    const tags = await promptsRepo.getTags(id)
    if (tags.length === 0) {
      const result = await promptsRepo.getAll(0, 20)
      return mapToViewModels((result.data ?? []).filter((p) => p.id !== id).slice(0, 4))
    }

    const result = await promptsRepo.filterByTag(tags[0].slug, 0, 20)
    const filtered = (result.data ?? []).filter((p) => p.id !== id).slice(0, 5)
    return mapToViewModels(filtered)
  },

  toggleReaction: async (
    id: string,
    lenserId: string,
    reaction: 'like' | 'love' | 'clap' | 'saved' | 'copy'
  ) => {
    const { added, summary } = await reactionService.toggleReaction(
      'prompt_template',
      id,
      lenserId,
      reaction
    )
    return { added, summary }
  },

  createPrompt: async (input: CreatePromptDTO): Promise<PromptTemplateRecord> => {
    if (!input.title || input.title.trim().length < 3)
      throw new Error('Title must be at least 3 characters long.')
    if (!input.content || input.content.trim().length < 10)
      throw new Error('Content must be at least 10 characters long.')

    if (!input.description) {
      input.description =
        input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '')
    }

    const resolvedTags = await tagService.processBatchInput(input.tagIds)
    const realTagIds = resolvedTags.map((t) => t.id)

    const prompt = await promptsRepo.createPrompt({
      ...input,
      tagIds: realTagIds,
    })

    // Batch logging for create
    tagService
      .recordBatchActivity(
        realTagIds.map((tagId) => ({
          tag_id: tagId,
          entity_type: 'prompt',
          entity_id: prompt.id,
          activity_type: 'created',
        }))
      )
      .catch(console.error)
    return prompt
  },

  updatePrompt: async (
    id: string,
    input: Partial<CreatePromptDTO>,
    _lenserId?: string
  ): Promise<PromptTemplateRecord> => {
    const existing = await promptsRepo.getById(id)
    if (!existing) throw new Error('Prompt not found')

    if (input.content && !input.description) {
      input.description =
        input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '')
    }

    let realTagIds: string[] | undefined = undefined
    if (input.tagIds) {
      const resolvedTags = await tagService.processBatchInput(input.tagIds)
      realTagIds = resolvedTags.map((t) => t.id)
    }

    return promptsRepo.updatePrompt(id, { ...input, tagIds: realTagIds })
  },

  deletePrompt: async (id: string, _lenserId?: string): Promise<void> => {
    const existing = await promptsRepo.getById(id)
    if (!existing) throw new Error('Prompt not found')
    await promptsRepo.deletePrompt(id)
  },

  // Backward compatibility alias for deprecated method if needed elsewhere
  getAuthorPrompts: async (lenserHandle: string, offset = 0, limit = 10, viewerId?: string) => {
    return promptsService.getLenserPrompts(lenserHandle, offset, limit, viewerId)
  },
}
