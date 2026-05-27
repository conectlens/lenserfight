import {
  battlesService,
  type BattleFeedItemRecord,
  lenserService,
  lensesService,
  tagService,
  threadsService,
} from '@lenserfight/data/repositories'

import type {
  LensDetailViewModel,
  LensViewModel,
  Lenser,
  TagUsage,
  ThreadDetailViewModel,
  ThreadFeedItem,
} from '@lenserfight/types'

export type { BattleFeedItemRecord as MobileBattle }

export interface TagDetailBundle {
  tag: TagUsage | null
  threads: ThreadFeedItem[]
  lenses: LensViewModel[]
}

function publicMessage(error: unknown): Error {
  if (error instanceof Error) {
    if (error.message === '401') return new Error('You are not authorized to view this item.')
    if (error.message === '404') return new Error('The requested item was not found.')
  }
  return new Error('We could not load this content. Please try again.')
}

export const mobileContentService = {
  async listThreads(): Promise<ThreadFeedItem[]> {
    try {
      const response = await threadsService.getThreadsFeed(undefined, 0, 20)
      return response.data ?? []
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getThread(id: string, viewerLenserId?: string): Promise<ThreadDetailViewModel | null> {
    try {
      return await threadsService.getThreadDetail(id, viewerLenserId)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async listLenses(): Promise<LensViewModel[]> {
    try {
      const response = await lensesService.getLenses(0, 20)
      return response.data ?? []
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getLens(id: string, viewerLenserId?: string): Promise<LensDetailViewModel | null> {
    try {
      return await lensesService.getLensDetail(id, viewerLenserId)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async listTags(): Promise<TagUsage[]> {
    try {
      return await tagService.getCloud()
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getTag(slug: string): Promise<TagDetailBundle> {
    try {
      const [tag, threadResponse, lensResponse] = await Promise.all([
        tagService.getTagDetails(slug),
        threadsService.getThreadsByTag(slug, 'newest', undefined, 0, 10),
        lensesService.filter(slug, 0, 10),
      ])
      return {
        tag,
        threads: threadResponse.data ?? [],
        lenses: lensResponse.data ?? [],
      }
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getProfile(): Promise<Lenser | null> {
    try {
      return await lenserService.getAuthenticatedLenser()
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async listBattles(): Promise<BattleFeedItemRecord[]> {
    try {
      return await battlesService.getBattlesFeedItems({ limit: 20 })
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getBattle(id: string): Promise<BattleFeedItemRecord | null> {
    try {
      const record = await battlesService.getBattleById(id)
      if (!record) return null
      // Map BattleRecord to BattleFeedItemRecord shape for the mobile screen
      return {
        id: record.id,
        slug: record.slug ?? '',
        title: record.title ?? 'Untitled',
        status: record.status,
        published_at: record.published_at ?? null,
        battle_type: record.battle_type,
        voter_eligibility: record.voter_eligibility ?? 'open',
        total_vote_count: record.total_vote_count ?? 0,
        voting_opens_at: record.voting_opens_at ?? null,
        voting_closes_at: record.voting_closes_at ?? null,
        contender_a_id: null,
        contender_a_name: null,
        contender_a_type: null,
        contender_b_id: null,
        contender_b_name: null,
        contender_b_type: null,
        winner_slot: null,
        content_type: null,
      } as BattleFeedItemRecord
    } catch (error) {
      throw publicMessage(error)
    }
  },
}
