import { SupabaseLenserRepository } from '../repositories/lenserRepository'
import { SupabaseLensesRepository } from '../repositories/lensesRepository'
import { SupabaseReactionRepository } from '../repositories/reactionRepository'
import {
  LensViewModel,
  LensDetailViewModel,
  LensRecord,
  PersonalLensFeedItem,
  CreateLensDTO,
  LensAuthor,
  LensVersion,
  CreateLensVersionDTO,
  ForkNode,
} from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

import { reactionService } from './reactionService'
import { tagService } from './tagService'

const lensesRepo = new SupabaseLensesRepository()
const lenserRepo = new SupabaseLenserRepository()
const reactionRepo = new SupabaseReactionRepository()

// Helper to resolve author from denormalized profile
const resolveAuthor = (record: any): LensAuthor => {
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
): Promise<LensViewModel[]> => {
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

export const lensesService = {
  getLenses: async (offset = 0, limit = 10): Promise<ApiResponseEnvelope<LensViewModel[]>> => {
    const result = await lensesRepo.getAll(offset, limit)
    const items = await mapToViewModels(result.data ?? [])
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  search: async (query: string, offset = 0, limit = 10): Promise<ApiResponseEnvelope<LensViewModel[]>> => {
    const result = await lensesRepo.search(query, offset, limit)
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
    limit = 20,
    sort: 'newest' | 'trending' | 'popular' = 'newest'
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> => {
    const result = await lensesRepo.filterByTag(tagSlug, sort, offset, limit)
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
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> => {
    const result = await lensesRepo.sort(order, offset, limit)
    const items = await mapToViewModels(result.data ?? [])
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  getTopLenses: async (limit: number = 3): Promise<LensViewModel[]> => {
    const records = await lensesRepo.getTopLenses(limit)
    return mapToViewModels(records)
  },

  getTrending: async (
    lang?: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> => {
    return lensesRepo.getTrendingLenses(lang, offset, limit)
  },

  getPersonalFeed: async (
    _lenserId: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<PersonalLensFeedItem[]>> => {
    return lensesRepo.getPersonalFeed(offset, limit)
  },

  getLenserLenses: async (
    lenserHandle: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<LensViewModel[]> => {
    let includePrivate = false
    if (viewerId) {
      const viewer = await lenserRepo.getLenserById(viewerId)
      if (viewer && viewer.handle === lenserHandle) {
        includePrivate = true
      }
    }

    const records = await lensesRepo.getByLenser(lenserHandle, offset, limit, includePrivate)
    return mapToViewModels(records)
  },

  getLensDetail: async (
    id: string,
    viewerLenserId?: string
  ): Promise<LensDetailViewModel | null> => {
    const record: any = await lensesRepo.getById(id, viewerLenserId)
    if (!record) return null

    if (record.visibility === 'private') {
      if (!viewerLenserId || record.lenser_id !== viewerLenserId) {
        throw new Error('401')
      }
    }

    const [viewModel] = await mapToViewModels([record], viewerLenserId)
    const summary = await reactionService.getReactionSummary('lens', id, viewerLenserId)

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
      parentLensId: record.parent_lens_id ?? null,
      forkedFromExecutionId: record.forked_from_execution_id ?? null,
      params: record.params ?? [],
    }
  },

  getRelatedLenses: async (id: string): Promise<LensViewModel[]> => {
    const tags = await lensesRepo.getTags(id)
    if (tags.length === 0) {
      const result = await lensesRepo.getAll(0, 20)
      return mapToViewModels((result.data ?? []).filter((p) => p.id !== id).slice(0, 4))
    }

    const result = await lensesRepo.filterByTag(tags[0].slug, 'newest', 0, 20)
    const filtered = (result.data ?? []).filter((p) => p.id !== id).slice(0, 5)
    return mapToViewModels(filtered)
  },

  toggleReaction: async (
    id: string,
    lenserId: string,
    reaction: 'like' | 'love' | 'clap' | 'saved' | 'copy'
  ) => {
    const { added, summary } = await reactionService.toggleReaction(
      'lens',
      id,
      lenserId,
      reaction
    )
    return { added, summary }
  },

  createLens: async (input: CreateLensDTO): Promise<LensRecord> => {
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

    const lens = await lensesRepo.createLens({
      ...input,
      tagIds: realTagIds,
    })

    // Batch logging for create
    tagService
      .recordBatchActivity(
        realTagIds.map((tagId) => ({
          tag_id: tagId,
          entity_type: 'lens',
          entity_id: lens.id,
          activity_type: 'created',
        }))
      )
      .catch(console.error)
    return lens
  },

  updateLens: async (
    id: string,
    input: Partial<CreateLensDTO>,
    _lenserId?: string
  ): Promise<LensRecord> => {
    const existing = await lensesRepo.getById(id)
    if (!existing) throw new Error('Lens not found')

    if (input.content && !input.description) {
      input.description =
        input.content.substring(0, 100) + (input.content.length > 100 ? '...' : '')
    }

    let realTagIds: string[] | undefined = undefined
    if (input.tagIds) {
      const resolvedTags = await tagService.processBatchInput(input.tagIds)
      realTagIds = resolvedTags.map((t) => t.id)
    }

    return lensesRepo.updateLens(id, { ...input, tagIds: realTagIds })
  },

  deleteLens: async (id: string, _lenserId?: string): Promise<void> => {
    const existing = await lensesRepo.getById(id)
    if (!existing) throw new Error('Lens not found')
    await lensesRepo.deleteLens(id)
  },

  // Backward compatibility alias for deprecated method if needed elsewhere
  getAuthorLenses: async (lenserHandle: string, offset = 0, limit = 10, viewerId?: string) => {
    return lensesService.getLenserLenses(lenserHandle, offset, limit, viewerId)
  },

  // ─── Versioning ───────────────────────────────────────────────────────────

  getVersions: async (lensId: string): Promise<LensVersion[]> => {
    return lensesRepo.getVersions(lensId)
  },

  getVersionById: async (versionId: string): Promise<LensVersion | null> => {
    return lensesRepo.getVersionById(versionId)
  },

  getLatestPublishedVersion: async (lensId: string): Promise<LensVersion | null> => {
    return lensesRepo.getLatestPublishedVersion(lensId)
  },

  createVersion: async (input: CreateLensVersionDTO): Promise<LensVersion> => {
    if (!input.templateBody || input.templateBody.trim().length < 1) {
      throw new Error('Template body cannot be empty.')
    }
    return lensesRepo.createVersion(input)
  },

  publishVersion: async (versionId: string): Promise<void> => {
    return lensesRepo.publishVersion(versionId)
  },

  cloneLens: async (sourceLensId: string, versionId?: string | null): Promise<string> => {
    return lensesRepo.cloneLens(sourceLensId, versionId)
  },

  getForkTree: async (lensId: string): Promise<ForkNode[]> => {
    return lensesRepo.getForkTree(lensId)
  },
}
