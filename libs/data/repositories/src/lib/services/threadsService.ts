import { SupabaseLenserRepository } from '../repositories/lenserRepository'
import { SupabaseReactionRepository } from '../repositories/reactionRepository'
import { SupabaseThreadsRepository } from '../repositories/threadsRepository'
import {
  ThreadFeedItem,
  PersonalFeedItem,
  ThreadDetailViewModel,
  ThreadRecord,
  TagRecord,
  Visibility,
  CreateThreadDTO,
  ThreadAuthor,
} from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

import { tagService } from './tagService'
import { threadInteractionService } from './threadInteractionService'

const threadsRepo = new SupabaseThreadsRepository()
const lenserRepo = new SupabaseLenserRepository()
const reactionRepo = new SupabaseReactionRepository()

const sumReactionTotals = (reactionTotals?: Record<string, number>): number => {
  return Object.values(reactionTotals ?? {}).reduce((total, count) => total + count, 0)
}

const resolveAuthor = (record: Pick<ThreadRecord, 'author_profile' | 'lenser_id'>): ThreadAuthor => {
  const profile = record.author_profile
  return {
    // ID is preserved for ownership checks (e.g. edit/delete permissions)
    id: profile?.id || record.lenser_id || 'unknown',
    // Presentation layer attributes strictly from profile snapshot or default
    displayName: profile?.display_name || 'Unknown',
    handle: profile?.handle || 'unknown',
    avatarUrl: profile?.avatar_url || null,
  }
}

export const threadsService = {
  createThread: async (input: {
    title: string
    content: string
    tagIds: string[]
    visibility: Visibility
  }): Promise<ThreadRecord> => {
    const resolvedTags = await tagService.processBatchInput(input.tagIds)
    const realTagIds = resolvedTags.map((t) => t.id)
    const thread = await threadsRepo.createThread({ ...input, tagIds: realTagIds })
    return thread
  },

  updateThread: async (
    id: string,
    input: Partial<CreateThreadDTO>,
    _lenserId: string
  ): Promise<ThreadRecord> => {
    void _lenserId
    let realTagIds: string[] | undefined = undefined
    if (input.tagIds) {
      const resolvedTags = await tagService.processBatchInput(input.tagIds)
      realTagIds = resolvedTags.map((t) => t.id)
    }
    return threadsRepo.updateThread(id, { ...input, tagIds: realTagIds })
  },

  deleteThread: async (id: string, lenserHandle: string): Promise<void> => {
    const existing = await threadsRepo.getThreadById(id)
    if (!existing) throw new Error('Thread not found')

    const recordHandle = existing.author_profile?.handle || ''
    if (recordHandle !== lenserHandle) {
      throw new Error('Unauthorized to delete this thread')
    }

    await threadsRepo.deleteThread(id)
  },

  getThreadsFeed: async (
    currentUserId?: string,
    offset = 0,
    limit = 10
  ): Promise<ApiResponseEnvelope<ThreadFeedItem[]>> => {
    const result = await threadsRepo.getAllThreads(offset, limit)
    const items = await threadsService._mapToFeedItems(result.data ?? [], currentUserId)
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  getThreadsByTag: async (
    slug: string,
    currentUserId?: string,
    offset = 0,
    limit = 10
  ): Promise<ApiResponseEnvelope<ThreadFeedItem[]>> => {
    const result = await threadsRepo.getThreadsByTag(slug, offset, limit)
    const items = await threadsService._mapToFeedItems(result.data ?? [], currentUserId)
    return paginatedResponse(items, {
      limit: result.meta?.limit ?? limit,
      offset: result.meta?.offset ?? offset,
      total: result.meta?.total,
      hasNextPage: result.meta?.hasNextPage ?? false,
    }, { durationMs: result.meta?.durationMs })
  },

  getThreadsByLenser: async (
    lenserHandle: string,
    viewerLenserId?: string,
    offset = 0,
    limit = 10
  ): Promise<ThreadFeedItem[]> => {
    // Similar check as prompts service for visibility
    let includePrivate = false
    if (viewerLenserId) {
      const viewer = await lenserRepo.getLenserById(viewerLenserId)
      if (viewer && viewer.handle === lenserHandle) {
        includePrivate = true
      }
    }

    const records = await threadsRepo.getByLenser(lenserHandle, offset, limit, includePrivate)
    return threadsService._mapToFeedItems(records, viewerLenserId)
  },

  // Pure Mapper: Converts DB Record -> Domain Model using internal author_profile and tags
  _mapToFeedItems: async (
    records: ThreadRecord[],
    currentUserId?: string
  ): Promise<ThreadFeedItem[]> => {
    if (records.length === 0) return []

    const userReactedIds = new Set<string>()
    if (currentUserId) {
      const ids = records.map((r) => r.id)
      const reactions = await reactionRepo.getBatchUserReactions('thread', ids, currentUserId)
      reactions.forEach((r) => userReactedIds.add(r.target_id))
    }

    return records.map((record) => {
      const tags = record.tags || [] // Use denormalized tags directly

      return {
        id: record.id,
        author: resolveAuthor(record),
        title: record.title,
        content: record.content,
        tags: tags,
        reactionCount: sumReactionTotals(record.reaction_totals),
        replyCount: record.reply_count || 0,
        createdAt: record.created_at,
        userHasReacted: userReactedIds.has(record.id),
        visibility: record.visibility,
        status: record.status,
      }
    })
  },

  getThreadDetail: async (
    threadId: string,
    viewerLenserId?: string
  ): Promise<ThreadDetailViewModel | null> => {
    const record = await threadsRepo.getThreadById(threadId, viewerLenserId)
    if (!record) return null

    if (record.visibility === 'private') {
      if (!viewerLenserId || record.lenser_id !== viewerLenserId) {
        throw new Error('401')
      }
    }

    let userHasReacted = false
    if (viewerLenserId) {
      const [reaction] = await reactionRepo.getUserReaction('thread', threadId, viewerLenserId)
      userHasReacted = !!reaction
    }

    const replies = await threadInteractionService.getReplyTree(threadId, viewerLenserId)

    return {
      id: record.id,
      title: record.title,
      content: record.content,
      createdAt: record.created_at,
      author: resolveAuthor(record),
      tags: record.tags || [],
      reactionCount: sumReactionTotals(record.reaction_totals),
      userHasReacted: userHasReacted,
      replies: replies,
      promptBlock: record.prompt_data,
      visibility: record.visibility,
      status: record.status,
    }
  },

  getTrendingTags: async (limit: number = 6): Promise<TagRecord[]> => {
    return threadsRepo.getTrendingTags(limit)
  },

  getTrendingFeed: async (
    lang?: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<ThreadFeedItem[]>> => {
    const result = await threadsRepo.getTrendingThreads(lang, offset, limit)
    const items = result.data ?? []
    return paginatedResponse(
      items,
      {
        limit: result.meta?.limit ?? limit,
        offset: result.meta?.offset ?? offset,
        total: result.meta?.total,
        hasNextPage: result.meta?.hasNextPage ?? false,
      },
      { durationMs: result.meta?.durationMs }
    )
  },

  getPersonalFeed: async (
    _lenserId: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<PersonalFeedItem[]>> => {
    const result = await threadsRepo.getPersonalFeed(offset, limit)
    const items = result.data ?? []
    return paginatedResponse(
      items,
      {
        limit: result.meta?.limit ?? limit,
        offset: result.meta?.offset ?? offset,
        total: result.meta?.total,
        hasNextPage: result.meta?.hasNextPage ?? false,
      },
      { durationMs: result.meta?.durationMs }
    )
  },

  // Backward compatibility alias
  getThreadsByAuthor: async (
    lenserHandle: string,
    currentUserId?: string,
    offset = 0,
    limit = 10
  ) => {
    return threadsService.getThreadsByLenser(lenserHandle, currentUserId, offset, limit)
  },
}
