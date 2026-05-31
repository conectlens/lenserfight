import {
  battlesService,
  type BattleFeedItemRecord,
  type ContenderRecord,
  type SubmitVoteInput,
  type VoteAggregateRecord,
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

/**
 * Detail-screen battle shape. Extends the feed-item shape with the authoritative
 * winner id from fn_get_battle (BattleRecord.winner_contender_id) so the detail
 * screen can derive the winner slot by matching contender ids — winner_slot on
 * the feed-item shape is only populated by the feed RPC, not the single-battle RPC.
 */
export type MobileBattle = BattleFeedItemRecord & {
  winner_contender_id: string | null
}

export type { ContenderRecord, SubmitVoteInput, VoteAggregateRecord }

export interface TagDetailBundle {
  tag: TagUsage | null
  threads: ThreadFeedItem[]
  lenses: LensViewModel[]
}

export interface MobileBattleResult {
  battle: MobileBattle
  contenders: ContenderRecord[]
  aggregates: VoteAggregateRecord[]
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

  async getLenserLenses(handle: string, viewerId?: string): Promise<LensViewModel[]> {
    try {
      return await lensesService.getLenserLenses(handle, 0, 10, viewerId)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getLenserThreads(handle: string, viewerId?: string): Promise<ThreadFeedItem[]> {
    try {
      return await threadsService.getThreadsByLenser(handle, viewerId, 0, 10)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getBattle(id: string): Promise<MobileBattle | null> {
    try {
      const record = await battlesService.getBattleById(id)
      if (!record) return null
      // Map BattleRecord to the detail-screen shape. winner_slot is not on the
      // single-battle RPC; carry the authoritative winner_contender_id so the
      // screen derives the slot by matching contender ids.
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
        winner_contender_id: record.winner_contender_id ?? null,
        content_type: record.content_type ?? null,
      }
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getBattleResult(id: string): Promise<MobileBattleResult | null> {
    try {
      // Resolve the battle directly by id (single-battle RPC) instead of scanning
      // the keyset-paginated feed, which misses older/closed battles outside the
      // newest-first window (deep links, history). Three parallel RPCs, no N+1.
      const [battle, contenders, aggregates] = await Promise.all([
        this.getBattle(id),
        battlesService.getContenders(id),
        battlesService.getVoteAggregates(id),
      ])
      if (!battle) return null
      return { battle, contenders, aggregates }
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getMyBattleVote(id: string): Promise<{ vote_value: string } | null> {
    try {
      return await battlesService.getMyVote(id)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async checkBattleVoteEligibility(battleId: string, lenserId: string): Promise<boolean> {
    try {
      return await battlesService.checkVoterEligibility(battleId, lenserId)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  // Intentionally NOT wrapped in publicMessage: fn_submit_vote enforces
  // eligibility/rate-limit (P0429) server-side and its message must reach the UI.
  async submitBattleVote(input: SubmitVoteInput): Promise<void> {
    await battlesService.submitVote(input)
  },
}
