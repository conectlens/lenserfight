import {
  SupabaseBattlesRepository,
  BattleRecord,
  BattleCommentRecord,
  GlobalMessageRecord,
  BattleFeedItemRecord,
  BattlesFeedOptions,
  ContenderRecord,
  VoteAggregateRecord,
  ScorecardRecord,
  RubricCriterionRecord,
  SubmissionRecord,
  SubmitVoteInput,
  InviteContenderInput,
  ContenderLensAssignmentRecord,
  AssignLensInput,
  CreateBattleInput,
  ScheduleBattleInput,
  ChatCursor,
  AiJudgeVerdictRecord,
  DLQEntryRecord,
  PublicExecutionJobRecord,
} from '../repositories/battlesRepository'

const battlesRepo = new SupabaseBattlesRepository()

export type { BattleRecord, BattleCommentRecord, GlobalMessageRecord, BattleFeedItemRecord, BattlesFeedOptions, ContenderRecord, VoteAggregateRecord, ScorecardRecord, RubricCriterionRecord, SubmissionRecord, SubmitVoteInput, InviteContenderInput, ContenderLensAssignmentRecord, AssignLensInput, CreateBattleInput, ScheduleBattleInput, ChatCursor, AiJudgeVerdictRecord, DLQEntryRecord, PublicExecutionJobRecord }

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
  createBattle: async (input: CreateBattleInput): Promise<BattleRecord> => {
    // Server-side validation mirrors the domain rules — ensures CLI and API
    // callers get the same protection as the wizard UI.
    const { battleCreationValidator, isCompatibleCombination } = await import('@lenserfight/domain/battle-governance')
    const format = input.workflow_id ? 'workflow' : input.lens_id ? 'lens' : null
    if (format && !isCompatibleCombination(format, input.battle_type)) {
      throw new Error(
        `Battle type "${input.battle_type}" is not allowed for format "${format}". ` +
        `Pick a compatible battle type.`
      )
    }
    if (input.lenser_battle_policy) {
      const policyViolations = battleCreationValidator.validateLenserBattlePolicy(
        'lenser_battle',
        input.lenser_battle_policy as any,
      )
      if (policyViolations.some((v) => v.severity === 'error')) {
        throw new Error(policyViolations.map((v) => v.message).join('; '))
      }
    }
    return battlesRepo.createBattle(input)
  },

  getBattleById: (id: string): Promise<BattleRecord | null> =>
    battlesRepo.getBattleById(id),

  getBattleBySlug: (slug: string): Promise<BattleRecord | null> =>
    battlesRepo.getBattleBySlug(slug),

  updateBattle: (id: string, input: Partial<CreateBattleInput>): Promise<BattleRecord> =>
    battlesRepo.updateBattle(id, input),

  scheduleBattle: (input: ScheduleBattleInput): Promise<BattleRecord> =>
    battlesRepo.scheduleBattle(input),

  getLatestDraftBattleByWorkflowId: (workflowId: string): Promise<BattleRecord | null> =>
    battlesRepo.getLatestDraftBattleByWorkflowId(workflowId),

  getBattlesFeed: (filter?: string, limit?: number, cursor?: string, sortBy?: 'newest' | 'most_votes' | 'trending'): Promise<BattleRecord[]> =>
    battlesRepo.getBattlesFeed(filter, limit, undefined, cursor, sortBy),

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

  getMyVote: (battleId: string): Promise<{ vote_value: string } | null> =>
    battlesRepo.getMyVote(battleId),

  submitVote: (input: SubmitVoteInput): Promise<void> =>
    battlesRepo.submitVote(input).then(() => undefined),

  publishBattle: (battleId: string): Promise<BattleRecord> =>
    battlesRepo.publishBattle(battleId),

  getBattleComments: (battleId: string, limit?: number, cursor?: ChatCursor): Promise<BattleCommentRecord[]> =>
    battlesRepo.getBattleComments(battleId, limit, cursor),

  postComment: (battleId: string, lenserId: string, body: string): Promise<BattleCommentRecord> =>
    battlesRepo.postComment(battleId, lenserId, body),

  getGlobalMessages: (battleId: string, limit?: number, cursor?: ChatCursor): Promise<GlobalMessageRecord[]> =>
    battlesRepo.getGlobalMessages(battleId, limit, cursor),

  postGlobalMessage: (battleId: string, senderId: string, senderHandle: string, senderRole: string, body: string): Promise<GlobalMessageRecord> =>
    battlesRepo.postGlobalMessage(battleId, senderId, senderHandle, senderRole, body),

  getContenders: (battleId: string): Promise<ContenderRecord[]> =>
    battlesRepo.getContenders(battleId),

  removeContender: (contenderId: string): Promise<void> =>
    battlesRepo.removeContender(contenderId),

  inviteContender: (input: InviteContenderInput): Promise<ContenderRecord> =>
    battlesRepo.inviteContender(input),

  submitContenderEntry: (battleId: string, contenderId: string, contentText: string): Promise<SubmissionRecord> =>
    battlesRepo.submitContenderEntry(battleId, contenderId, contentText),

  linkForumThread: (battleId: string, forumThreadId: string): Promise<void> =>
    battlesRepo.linkForumThread(battleId, forumThreadId),

  checkVoterEligibility: (battleId: string, lenserId: string): Promise<boolean> =>
    battlesRepo.checkVoterEligibility(battleId, lenserId),

  assignLensToContender: (input: AssignLensInput): Promise<ContenderLensAssignmentRecord> =>
    battlesRepo.assignLensToContender(input),

  getLensAssignment: (contenderId: string): Promise<ContenderLensAssignmentRecord | null> =>
    battlesRepo.getLensAssignment(contenderId),

  openVoting: (battleId: string): Promise<void> =>
    battlesRepo.openVoting(battleId),

  closeVoting: (battleId: string): Promise<void> =>
    battlesRepo.closeVoting(battleId),

  getAiJudgeVerdicts: (battleId: string): Promise<AiJudgeVerdictRecord[]> =>
    battlesRepo.getAiJudgeVerdicts(battleId),

  getAiJudgeVerdictsByContender: async (battleId: string): Promise<Record<string, AiJudgeVerdictRecord[]>> => {
    const verdicts = await battlesRepo.getAiJudgeVerdicts(battleId)
    return verdicts.reduce<Record<string, AiJudgeVerdictRecord[]>>((acc, v) => {
      if (!acc[v.contender_id]) acc[v.contender_id] = []
      acc[v.contender_id].push(v)
      return acc
    }, {})
  },

  getDLQEntries: (opts?: { battleId?: string; unresolvedOnly?: boolean; limit?: number }): Promise<DLQEntryRecord[]> =>
    battlesRepo.getDLQEntries(opts),

  retryDLQEntry: (deadLetterId: string): Promise<void> =>
    battlesRepo.retryDLQEntry(deadLetterId),

  getPublicExecutionJobs: (battleId: string): Promise<PublicExecutionJobRecord[]> =>
    battlesRepo.getPublicExecutionJobs(battleId),

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
