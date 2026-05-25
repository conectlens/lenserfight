import { supabase } from '@lenserfight/data/supabase'
import { MentionParser } from '@lenserfight/utils/text'

import { tagService } from './tagService'

export interface ResolvedSegment {
  type: 'text' | 'mention' | 'tag'
  content: string // The display text (e.g. "Prompt Title" or raw text)
  id?: string
  entityType?: string
  link?: string
  isValid?: boolean
}

interface BatchResolvedLens {
  id: string
  title: string
  link: string
}

interface BatchResolvedUser {
  id: string
  handle: string
  display_name: string
}

/**
 * Batch-fetches lens titles for all Prompt/Lens mention IDs in a single RPC round-trip.
 */
async function batchResolveLenses(ids: string[]): Promise<Map<string, BatchResolvedLens>> {
  if (ids.length === 0) return new Map()
  try {
    const { data, error } = await supabase.rpc('fn_resolve_mentions', { p_ids: ids })
    if (error || !data) return new Map()
    return new Map((data as BatchResolvedLens[]).map((row) => [row.id, row]))
  } catch {
    return new Map()
  }
}

/**
 * Batch-fetches user profile data for all User mention IDs in a single query.
 */
async function batchResolveUsers(ids: string[]): Promise<Map<string, BatchResolvedUser>> {
  if (ids.length === 0) return new Map()
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .in('id', ids)
    if (error || !data) return new Map()
    return new Map((data as BatchResolvedUser[]).map((row) => [row.id, row]))
  } catch {
    return new Map()
  }
}

/**
 * Service responsible for hydrating mention tokens with actual entity data.
 * Uses a single batch RPC call (fn_resolve_mentions) for lens mentions instead
 * of N+1 getLensDetail calls. Tags are resolved concurrently (lightweight).
 *
 * Note: MentionParser stores lenses as @[Prompt:UUID] tokens (entityType='Prompt').
 * Both 'Prompt' and 'Lens' entity types are handled for forward compatibility.
 */
export const mentionService = {
  resolveContent: async (rawContent: string): Promise<ResolvedSegment[]> => {
    const segments = MentionParser.parseSegments(rawContent)
    if (segments.length === 0) return []

    // Collect all lens mention IDs (Prompt = stored format, Lens = future/aliases)
    const lensIds = segments
      .filter((s) => s.type === 'mention' && (s.entityType === 'Prompt' || s.entityType === 'Lens'))
      .map((s) => (s as { id: string }).id)

    // Collect user mention IDs
    const userIds = segments
      .filter((s) => s.type === 'mention' && s.entityType === 'User')
      .map((s) => (s as { id: string }).id)

    // Start all resolutions concurrently
    const lensMapPromise = batchResolveLenses(lensIds)
    const userMapPromise = batchResolveUsers(userIds)

    // Resolve unique tag IDs concurrently
    const uniqueTagIds = [...new Set(
      segments.filter((s) => s.type === 'tag').map((s) => (s as { id: string }).id)
    )]
    const tagEntries = await Promise.all(
      uniqueTagIds.map(async (id) => {
        try {
          const tag = await tagService.getTagDetailsById(id)
          return [id, tag] as const
        } catch {
          return [id, null] as const
        }
      })
    )
    const tagMap = new Map(tagEntries)
    const [lensMap, userMap] = await Promise.all([lensMapPromise, userMapPromise])

    return segments.map((segment): ResolvedSegment => {
      if (segment.type === 'text') {
        return { type: 'text', content: segment.content }
      }

      if (segment.type === 'tag') {
        const tag = tagMap.get(segment.id)
        if (tag) {
          return {
            type: 'tag',
            content: tag.name,
            id: segment.id,
            entityType: 'Tag',
            link: `/ray/${tag.slug}`,
            isValid: true,
          }
        }
        return {
          type: 'tag',
          content: segment.id,
          id: segment.id,
          entityType: 'Tag',
          isValid: false,
        }
      }

      if (segment.type === 'mention') {
        if (segment.entityType === 'Prompt' || segment.entityType === 'Lens') {
          const lens = lensMap.get(segment.id)
          if (lens && lens.title) {
            return {
              type: 'mention',
              content: lens.title,
              id: segment.id,
              entityType: 'Lens',
              link: lens.link,
              isValid: true,
            }
          }
          return {
            type: 'mention',
            content: 'Unknown Lens',
            id: segment.id,
            entityType: 'Lens',
            isValid: false,
          }
        }

        if (segment.entityType === 'User') {
          const user = userMap.get(segment.id)
          if (user) {
            return {
              type: 'mention',
              content: user.display_name || `@${user.handle}`,
              id: segment.id,
              entityType: 'User',
              link: `/lenser/${user.handle}`,
              isValid: true,
            }
          }
          return {
            type: 'mention',
            content: 'Unknown Lenser',
            id: segment.id,
            entityType: 'User',
            isValid: false,
          }
        }

        // Future entity types (Thread, etc.)
        return {
          type: 'mention',
          content: `Unknown ${segment.entityType}`,
          id: segment.id,
          entityType: segment.entityType,
          isValid: false,
        }
      }

      return { type: 'text', content: '' }
    })
  },
}
