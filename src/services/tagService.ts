import { getTagRepository } from '../adapters/tagAdapter'
import { TagDomainError } from '../domain/tags/TagErrors'
import { TagValidator } from '../domain/tags/TagValidator'
import { TagUsage, TagDTO, TagInput } from '../types/tags.types'

const tagRepo = getTagRepository()

// --- Cache Implementation ---
interface TagCache {
  data: TagUsage[]
  timestamp: number
}

const CACHE_TTL = 15 * 60 * 1000 // 15 Minutes
let globalTagCache: TagCache | null = null

export const tagService = {
  /**
   * The Main Entry Point for User Input.
   * Orchestrates Validation, Normalization, and Persistence.
   */
  processUserInput: async (rawInput: TagInput): Promise<TagDTO> => {
    // 1. Normalization
    const normalizedName = TagValidator.normalizeName(
      typeof rawInput === 'string' ? rawInput : rawInput.name || rawInput.slug || ''
    )
    const normalizedSlug = TagValidator.generateSlug(
      typeof rawInput === 'string' ? rawInput : rawInput.slug || normalizedName
    )

    // 2. Validation
    TagValidator.validateDisplayName(normalizedName)
    TagValidator.validateSlug(normalizedSlug)

    // 3. Domain Logic: Find or Create
    // Check if tag exists
    const existingTag = await tagRepo.findBySlug(normalizedSlug)
    if (existingTag) {
      return existingTag
    }

    // Create new tag
    try {
      const newTag = await tagRepo.createTag(normalizedName, normalizedSlug)
      // Invalidate cache on creation to ensure cloud is up to date
      globalTagCache = null
      return newTag
    } catch (e: any) {
      // Race condition handling: If DB constraints catch a duplicate slug that we missed
      if (e.message?.includes('duplicate key') || e.code === '23505') {
        const retry = await tagRepo.findBySlug(normalizedSlug)
        if (retry) return retry
      }
      throw new TagDomainError(`Failed to create tag: ${e.message}`)
    }
  },

  /**
   * Bulk process function for multiple tags (e.g. from a post creation form)
   */
  processBatchInput: async (rawInputs: TagInput[]): Promise<TagDTO[]> => {
    if (!rawInputs.length) return []

    const uniqueInputs = rawInputs
      .map((input) =>
        typeof input === 'string'
          ? TagValidator.generateSlug(TagValidator.normalizeName(input))
          : TagValidator.generateSlug(input.slug || input.name || '')
      )
      .filter(Boolean)
    const distinctSlugs = Array.from(new Set(uniqueInputs))
    const results: TagDTO[] = []

    for (const slug of distinctSlugs) {
      try {
        const tag = await tagService.processUserInput({ slug })
        results.push(tag)
      } catch (e) {
        console.warn(`Skipping invalid tag slug "${slug}":`, e)
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
    // In a real app, this would fetch extended metadata from Repo
    // For now, we reuse the list + filter, or specific find
    const dto = await tagRepo.findBySlug(slug)
    if (!dto) return null

    // Enriched structure for UI
    return {
      ...dto,
      id: dto.id,
      count: 0,
      trendingScore: 0,
      created_at: new Date().toISOString(),
    }
  },
}
