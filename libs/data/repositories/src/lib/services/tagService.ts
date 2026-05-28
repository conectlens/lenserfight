import { TagDomainError, TagValidator } from '@lenserfight/domain/tags'
import { TagUsage, TagDTO, TagActivityEventDTO, ContentType } from '@lenserfight/types'
import { createTagRepository } from '../factory'


const tagRepo = createTagRepository()

// --- Cache Implementation ---
interface TagCache {
  data: TagUsage[]
  timestamp: number
}

const CACHE_TTL = 15 * 60 * 1000 // 15 Minutes
let globalTagCache: TagCache | null = null

const SLUG_CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const slugCache = new Map<string, { tag: TagDTO; timestamp: number }>()

export const tagService = {
  /**
   * The Main Entry Point for User Input.
   * Orchestrates Validation, Normalization, and Persistence.
   */
  processUserInput: async (rawInput: string): Promise<TagDTO> => {
    // 1. Normalization
    const name = TagValidator.normalizeName(rawInput)
    const slug = TagValidator.generateSlug(name)

    // 2. Validation
    TagValidator.validateDisplayName(name)
    TagValidator.validateSlug(slug)

    // 3. Check in-memory slug cache
    const now = Date.now()
    const cached = slugCache.get(slug)
    if (cached && now - cached.timestamp < SLUG_CACHE_TTL) {
      return cached.tag
    }

    // 4. Domain Logic: Find or Create
    const existingTag = await tagRepo.findBySlug(slug)
    if (existingTag) {
      slugCache.set(slug, { tag: existingTag, timestamp: now })
      return existingTag
    }

    // Create new tag
    try {
      const newTag = await tagRepo.createTag(name, slug)
      slugCache.set(slug, { tag: newTag, timestamp: now })
      // Invalidate cloud cache on creation to ensure cloud is up to date
      globalTagCache = null
      return newTag
    } catch (e: any) {
      // Race condition handling: If DB constraints catch a duplicate slug that we missed
      if (e.message?.includes('duplicate key') || e.code === '23505') {
        const retry = await tagRepo.findBySlug(slug)
        if (retry) {
          slugCache.set(slug, { tag: retry, timestamp: now })
          return retry
        }
      }
      throw new TagDomainError(`Failed to create tag: ${e.message}`)
    }
  },

  /**
   * Bulk process function for multiple tags (e.g. from a post creation form)
   */
  processBatchInput: async (rawInputs: string[]): Promise<TagDTO[]> => {
    if (!rawInputs.length) return []

    const uniqueInputs = Array.from(new Set(rawInputs.filter((i) => !!i?.trim())))
    const results: TagDTO[] = []

    for (const input of uniqueInputs) {
      try {
        const tag = await tagService.processUserInput(input)
        results.push(tag)
      } catch (e) {
        console.warn(`Skipping invalid tag "${input}":`, e)
        // We skip invalid tags in batch rather than failing the whole batch
      }
    }
    return results
  },

  // Read-only methods used by UI
  getCloud: async (): Promise<TagUsage[]> => {
    const now = Date.now()

    // Check Cache
    if (globalTagCache && now - globalTagCache.timestamp < CACHE_TTL) {
      return globalTagCache.data
    }

    // Fetch Fresh
    const tags = await tagRepo.getAllTagsWithCounts()
    if (tags.length === 0) return []

    const values = tags.map((t) => t.count)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const divisor = max - min === 0 ? 1 : max - min

    const weightedTags = tags
      .map((tag) => ({
        ...tag,
        weight: 1 + ((tag.count - min) / divisor) * 9,
      }))
      .sort((a, b) => b.count - a.count)

    // Update Cache
    globalTagCache = {
      data: weightedTags,
      timestamp: now,
    }

    return weightedTags
  },

  getTagDetails: async (slug: string): Promise<TagUsage | null> => {
    const dto = await tagRepo.findBySlug(slug)
    if (!dto) return null

    return {
      ...dto,
      id: dto.id,
      count: Number(dto.total_usage ?? 0),
      trendingScore: Number(dto.trend_score_7d ?? 0),
      created_at: dto.created_at ?? new Date().toISOString(),
    }
  },

  getTagDetailsById: async (id: string): Promise<TagUsage | null> => {
    const dto = await tagRepo.findById(id)
    if (!dto) return null

    return {
      ...dto,
      id: dto.id,
      count: Number(dto.total_usage ?? 0),
      trendingScore: Number(dto.trend_score_7d ?? 0),
      created_at: dto.created_at ?? new Date().toISOString(),
    }
  },

  searchTags: async (query: string, lang?: string): Promise<TagUsage[]> => {
    if (!query || query.length < 2) return []
    return tagRepo.searchTags(query, lang ?? 'en', 5)
  },

  // --- Activity Recording ---

  recordView: async (tagId: string, entityType: ContentType, entityId: string, userId?: string) => {
    await tagService.recordActivity(tagId, entityType, entityId, userId, 'viewed')
  },

  recordReaction: async (tagId: string, entityType: ContentType, entityId: string, userId?: string) => {
    await tagService.recordActivity(tagId, entityType, entityId, userId, 'reacted')
  },

  recordActivity: async (
    tagId: string,
    entityType: ContentType,
    entityId: string,
    userId?: string,
    type: 'created' | 'viewed' | 'reacted' = 'viewed'
  ) => {
    const event: TagActivityEventDTO = {
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: type,
      actor_id: userId,
    }
    await tagRepo.recordActivity(event)
  },

  recordBatchView: async (tagIds: string[], entityType: ContentType, entityId: string, userId?: string) => {
    if (!tagIds || tagIds.length === 0) return
    const events: TagActivityEventDTO[] = tagIds.map((tagId) => ({
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: 'viewed',
      actor_id: userId,
    }))
    await tagRepo.recordBatchActivity(events)
  },

  recordBatchActivity: async (events: TagActivityEventDTO[]) => {
    if (!events || events.length === 0) return
    await tagRepo.recordBatchActivity(events)
  },
}
