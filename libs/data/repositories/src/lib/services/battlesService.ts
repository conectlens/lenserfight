import {
  SupabaseBattlesRepository,
  BattleRecord,
  BattleFeedItemRecord,
  BattlesFeedOptions,
  ContenderRecord,
  VoteAggregateRecord,
  ScorecardRecord,
  RubricCriterionRecord,
  SubmissionRecord,
  SubmitVoteInput,
} from '../repositories/battlesRepository'

const battlesRepo = new SupabaseBattlesRepository()

export type { BattleRecord, BattleFeedItemRecord, BattlesFeedOptions, ContenderRecord, VoteAggregateRecord, ScorecardRecord, RubricCriterionRecord, SubmissionRecord, SubmitVoteInput }

export interface BattleContendersData {
  contenders: ContenderRecord[]
  submissions: SubmissionRecord[]
}

export interface BattleScorecardData {
  scorecards: ScorecardRecord[]
  criteria: RubricCriterionRecord[]
}

export interface WinnerInfo {
  slot: 'A' | 'B' | 'draw' | undefined
  name: string | undefined
}

export const battlesService = {
  getBattleBySlug: (slug: string): Promise<BattleRecord | null> =>
    battlesRepo.getBattleBySlug(slug),

  getBattlesFeed: (filter?: string, limit?: number): Promise<BattleRecord[]> =>
    battlesRepo.getBattlesFeed(filter, limit),

  getContendersAndSubmissions: async (battleId: string): Promise<BattleContendersData> => {
    const [contenders, submissions] = await Promise.all([
      battlesRepo.getContenders(battleId),
      battlesRepo.getSubmissions(battleId),
    ])
    return { contenders, submissions }
  },

  getVoteAggregates: (battleId: string): Promise<VoteAggregateRecord[]> =>
    battlesRepo.getVoteAggregates(battleId),

  getScorecardData: async (battleId: string): Promise<BattleScorecardData> => {
    const scorecards = await battlesRepo.getScorecards(battleId)
    const criterionIds = [...new Set(scorecards.map((s) => s.rubric_criterion_id))]
    const criteria = await battlesRepo.getRubricCriteria(criterionIds)
    return { scorecards, criteria }
  },

  getBattlesFeedItems: (options?: BattlesFeedOptions): Promise<BattleFeedItemRecord[]> =>
    battlesRepo.getBattlesFeedItems(options),

  submitVote: (input: SubmitVoteInput): Promise<void> =>
    battlesRepo.submitVote(input).then(() => undefined),

  deriveWinner: (
    aggregates: VoteAggregateRecord[],
    contenders: ContenderRecord[]
  ): WinnerInfo => {
    const contenderA = contenders.find((c) => c.slot === 'A')
    const contenderB = contenders.find((c) => c.slot === 'B')
    const aggregateA = contenderA ? aggregates.find((v) => v.contender_id === contenderA.id) : undefined
    const aggregateB = contenderB ? aggregates.find((v) => v.contender_id === contenderB.id) : undefined

    if (!aggregateA || !aggregateB) return { slot: undefined, name: undefined }

    const voteCountA = aggregateA.raw_vote_count ?? 0
    const voteCountB = aggregateB.raw_vote_count ?? 0

    if (aggregateA.rank_position === 1 && aggregateB.rank_position !== 1) {
      return { slot: 'A', name: contenderA?.display_name }
    }
    if (aggregateB.rank_position === 1 && aggregateA.rank_position !== 1) {
      return { slot: 'B', name: contenderB?.display_name }
    }
    if (voteCountA === voteCountB && voteCountA > 0) {
      return { slot: 'draw', name: undefined }
    }
    return { slot: undefined, name: undefined }
  },
}
