import { supabase } from '@lenserfight/data/supabase'

// --- Types ---

export interface BattleTemplateRecord {
  id: string
  title: string
  description: string | null
  task_prompt: string
  is_public: boolean
  max_contenders: number
  created_at: string
  updated_at: string
  category?: string | null
  creator_lenser_id?: string | null
}

export interface CreateTemplateInput {
  title: string
  description?: string | null
  taskPrompt: string
  category?: string | null
  maxContenders?: number
  isPublic?: boolean
}

// ─── Phase BH: Battle series ───────────────────────────────────────────────
export interface BattleSeriesRecord {
  id: string
  title: string
  template_id: string
  creator_lenser_id: string
  round_count: number
  current_round: number
  status: 'active' | 'complete'
  created_at: string
  updated_at: string
}

export interface SeriesRoundRecord {
  series_id: string
  title: string
  template_id: string
  creator_lenser_id: string
  round_count: number
  current_round: number
  status: 'active' | 'complete'
  round_number: number
  battle_id: string
  battle_slug: string | null
  battle_status: string | null
  winner_contender_id: string | null
}

export type BattleStatus =
  | 'draft'
  | 'open'
  | 'executing'
  | 'voting'
  | 'scoring'
  | 'closed'
  | 'published'
  | 'archived'

export type BattleType =
  | 'ai_vs_ai'
  | 'human_vs_human_ai_votes'
  | 'human_vs_human_open_votes'
  | 'human_vs_ai'
  | 'workflow_battle'
  | 'lenser_battle'

export type VoterEligibility = 'open' | 'human_only' | 'ai_only' | 'verified_lenser' | 'lenser_only'

export type ContenderType = 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
export type VoteValue = 'contender_a' | 'contender_b' | 'draw'
export type ScorecardResult = 'pass' | 'fail' | 'partial' | 'skipped'

export interface BattleRecord {
  id: string
  slug: string
  title: string
  task_prompt: string
  status: BattleStatus
  total_vote_count: number
  published_at: string | null
  voting_opens_at: string | null
  voting_closes_at: string | null
  battle_type: BattleType
  voter_eligibility: VoterEligibility
  handicap_config: Record<string, unknown>
  creator_lenser_id: string | null
  forum_thread_id: string | null
  workflow_id: string | null
  lens_id: string | null
  execution_starts_at: string | null
  auto_publish: boolean
  voting_duration_hours: number
  vote_velocity: number
  og_image_url: string | null
  content_type: string | null
}

export interface TrendingBattleRecord {
  id: string
  slug: string
  title: string
  status: string
  published_at: string | null
  battle_type: string
  total_vote_count: number
  vote_velocity: number
  og_image_url: string | null
  contender_a_name: string | null
  contender_b_name: string | null
  winner_slot: 'A' | 'B' | null
  content_type: string | null
}

export interface TrendingBattlesOptions {
  limit?: number
  cursor?: number | null
}

export interface BattleExecutionJobRecord {
  id: string
  battle_id: string
  contender_id: string
  slot: 'A' | 'B'
  status: 'queued' | 'claimed' | 'running' | 'completed' | 'failed'
  worker_id: string | null
  claimed_at: string | null
  completed_at: string | null
  retry_count: number
  max_retries: number
  error_message: string | null
  created_at: string
}

export interface ScheduleBattleInput {
  battle_id: string
  execution_starts_at: string
  voting_duration_hours?: number
  auto_publish?: boolean
}

export interface AIHandicapPolicyRecord {
  id: string
  battle_id: string
  max_tokens_per_second: number | null
  injected_delay_ms: number
  max_context_tokens: number | null
  allowed_model_tier: 'free' | 'paid' | 'enterprise' | null
  time_budget_ms: number | null
}

export interface CreateBattleInput {
  title: string
  task_prompt: string
  battle_type: BattleType
  voter_eligibility: VoterEligibility
  handicap?: Partial<Omit<AIHandicapPolicyRecord, 'id' | 'battle_id'>>
  funding_mode?: 'platform_credit' | 'wallet_funded' | 'sponsored'
  max_budget_credits?: number
  workflow_id?: string
  lens_id?: string
}

export interface ContenderRecord {
  id: string
  battle_id: string
  slot: 'A' | 'B'
  contender_type: ContenderType
  display_name: string
  contender_ref_id: string | null
}

export interface InviteContenderInput {
  battle_id: string
  slot: 'A' | 'B'
  contender_ref_id: string
  display_name: string
  contender_type: ContenderType
}

export type SubmissionOutputModality = 'text' | 'image' | 'video' | 'audio'

export interface SubmissionRecord {
  id: string
  battle_id: string
  contender_id: string
  content_text: string | null
  content_url: string | null
  status: string
  media_url?: string | null
  mime_type?: string | null
  output_modality?: SubmissionOutputModality | null
}

export interface VoteAggregateRecord {
  battle_id: string
  contender_id: string
  raw_vote_count: number
  weighted_vote_sum: number
  draw_count: number
  rank_position: number | null
}

export interface RubricCriterionRecord {
  id: string
  title: string
  description?: string
  weight: number
}

export interface ScorecardRecord {
  id: string
  battle_id: string
  contender_id: string
  rubric_criterion_id: string
  result: ScorecardResult
  explanation?: string
}

export interface AiJudgeVerdictRecord {
  id: string
  contender_id: string
  criterion_id: string | null
  score: number
  rationale: string | null
  model_key: string
  run_id: string | null
  created_at: string
}

export interface DLQEntryRecord {
  id: string
  job_id: string
  battle_id: string
  contender_id: string
  slot: string | null
  error_code: string | null
  error_message: string | null
  attempt_count: number
  payload: Record<string, unknown>
  resolved_at: string | null
  created_at: string
}

export interface PublicExecutionJobRecord {
  id: string
  battle_id: string
  slot: 'A' | 'B'
  status: 'queued' | 'claimed' | 'running' | 'completed' | 'failed'
  claimed_at: string | null
  completed_at: string | null
  retry_count: number
  created_at: string
}

export interface SubmitVoteInput {
  battle_id: string
  voter_lenser_id: string
  vote_value: VoteValue
  voted_contender_id: string | null
  rationale?: string
  is_draw?: boolean
}

export interface BattleCommentRecord {
  id: string
  battle_id: string
  lenser_id: string
  body: string
  created_at: string
  updated_at: string
  // joined from lensers.profiles
  lenser_handle?: string
  lenser_display_name?: string
  lenser_avatar_url?: string | null
}

export interface GlobalMessageRecord {
  id: string
  battle_id: string
  sender_id: string | null
  sender_handle: string
  sender_role: 'viewer' | 'lenser' | 'moderator' | 'system'
  body: string
  created_at: string
}

// --- Port ---

export interface BattleFeedItemRecord {
  id: string
  slug: string
  title: string
  status: BattleStatus
  published_at: string | null
  battle_type: BattleType
  voter_eligibility: VoterEligibility
  total_vote_count: number
  voting_opens_at: string | null
  voting_closes_at: string | null
  contender_a_id: string | null
  contender_a_name: string | null
  contender_a_type: ContenderType | null
  contender_b_id: string | null
  contender_b_name: string | null
  contender_b_type: ContenderType | null
  winner_slot: 'A' | 'B' | null
  content_type: string | null
}

export interface BattlesFeedOptions {
  status?: string
  battleType?: BattleType
  limit?: number
  cursor?: string
}

export interface ContenderLensAssignmentRecord {
  id: string
  contender_id: string
  battle_id: string
  lens_id: string
  version_id: string | null
  assigned_at: string
  input_snapshot: Record<string, unknown>
}

export interface AssignLensInput {
  contender_id: string
  battle_id: string
  lens_id: string
  version_id?: string | null
  input_snapshot?: Record<string, unknown>
}

export interface ChatCursor {
  before_ts: string // ISO timestamptz of the oldest loaded message
  before_id: string // uuid of the oldest loaded message
}

export interface BattlesRepositoryPort {
  getBattleBySlug(slug: string): Promise<BattleRecord | null>
  getBattlesFeed(filter?: string, limit?: number, battleType?: BattleType, cursor?: string, sortBy?: 'newest' | 'most_votes' | 'trending'): Promise<BattleRecord[]>
  getBattlesFeedItems(options?: BattlesFeedOptions): Promise<BattleFeedItemRecord[]>
  getContenders(battleId: string): Promise<ContenderRecord[]>
  getSubmissions(battleId: string): Promise<SubmissionRecord[]>
  getVoteAggregates(battleId: string): Promise<VoteAggregateRecord[]>
  getScorecards(battleId: string): Promise<ScorecardRecord[]>
  getRubricCriteria(criterionIds: string[]): Promise<RubricCriterionRecord[]>
  submitVote(input: SubmitVoteInput): Promise<{ vote_id: string; status: string; battle_id: string }>
  createBattle(input: CreateBattleInput): Promise<BattleRecord>
  getAIHandicapPolicy(battleId: string): Promise<AIHandicapPolicyRecord | null>
  checkVoterEligibility(battleId: string, lenserId: string): Promise<boolean>
  getGlobalMessages(battleId: string, limit?: number, cursor?: ChatCursor): Promise<GlobalMessageRecord[]>
  postGlobalMessage(battleId: string, senderId: string, senderHandle: string, senderRole: string, body: string): Promise<GlobalMessageRecord>
  inviteContender(input: InviteContenderInput): Promise<ContenderRecord>
  /** Caller should invoke contentModerationService.validate(contentText) before calling this. */
  submitContenderEntry(battleId: string, contenderId: string, contentText: string, validate?: (text: string) => Promise<void>): Promise<SubmissionRecord>
  linkForumThread(battleId: string, forumThreadId: string): Promise<void>
  assignLensToContender(input: AssignLensInput): Promise<ContenderLensAssignmentRecord>
  getLensAssignment(contenderId: string): Promise<ContenderLensAssignmentRecord | null>
  updateBattle(id: string, input: Partial<CreateBattleInput>): Promise<BattleRecord>
  getLatestDraftBattleByWorkflowId(workflowId: string): Promise<BattleRecord | null>
  openVoting(battleId: string): Promise<void>
  closeVoting(battleId: string): Promise<void>
  scheduleBattle(input: ScheduleBattleInput): Promise<BattleRecord>
  getBattleExecutionJobs(battleId: string): Promise<BattleExecutionJobRecord[]>
  getTrendingBattles(options?: TrendingBattlesOptions): Promise<TrendingBattleRecord[]>
  getAiJudgeVerdicts(battleId: string): Promise<AiJudgeVerdictRecord[]>
  getDLQEntries(opts?: { battleId?: string; unresolvedOnly?: boolean; limit?: number }): Promise<DLQEntryRecord[]>
  retryDLQEntry(deadLetterId: string): Promise<void>
  getPublicExecutionJobs(battleId: string): Promise<PublicExecutionJobRecord[]>
  listBattleTemplates(): Promise<BattleTemplateRecord[]>
  listPublicBattleTemplates(category?: string, limit?: number): Promise<BattleTemplateRecord[]>
  toggleBattleTemplatePublic(id: string, isPublic: boolean): Promise<void>
  createBattleFromTemplate(templateId: string, title: string, slug: string): Promise<string>
  createTemplate(input: CreateTemplateInput): Promise<BattleTemplateRecord>
  updateTemplate(id: string, input: Partial<CreateTemplateInput>): Promise<BattleTemplateRecord>
  deleteTemplate(id: string): Promise<void>
  getTemplateById(id: string): Promise<BattleTemplateRecord>
  submitMediaEntry(
    battleId: string,
    contenderId: string,
    mediaUrl: string,
    mimeType: string,
    outputModality: SubmissionOutputModality
  ): Promise<SubmissionRecord>
  uploadSubmissionMedia(
    battleId: string,
    contenderId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<{ publicUrl: string; mimeType: string; outputModality: SubmissionOutputModality }>
  // Phase BH: battle series
  createSeries(templateId: string, title: string, roundCount?: number): Promise<BattleSeriesRecord>
  advanceSeries(seriesId: string): Promise<BattleSeriesRecord>
  getSeries(seriesId: string): Promise<SeriesRoundRecord[]>
  // Phase BJ: model conformance logging
  logModelTestRun(input: LogModelTestRunInput): Promise<ModelTestRunRecord>
  getModelTestRuns(battleId: string, limit?: number): Promise<ModelTestRunRecord[]>
  // Phase BK: media quality gates
  checkMediaQuality(submissionId: string): Promise<MediaQualityResultRecord>
  // Phase BM: vote hardening
  getMyVoteFull(battleId: string): Promise<MyVoteRecord | null>
  changeVote(battleId: string, newContenderId: string): Promise<{ vote_id: string; updated_at: string }>
  // Phase BN: structured template prompts
  renderTemplatePrompt(templateId: string, variables: Record<string, string>): Promise<string>
  // Phase BP: browse API
  browseBattles(filters: BrowseFilters, cursor?: BrowseCursor, limit?: number): Promise<BrowseBattleRecord[]>
  // Phase BX: retention CTA
  nextRecommendation(battleId: string): Promise<NextRecommendation | null>
}

// Phase BX — retention CTA returned by fn_battles_next_recommendation -------
export type NextRecommendation =
  | { action: 'rematch'; battle_id: string; slug?: string }
  | { action: 'browse'; category: string | null }
  | { action: 'create'; template_id: string | null }

// Phase BJ — model conformance ledger ----------------------------------------
export interface LogModelTestRunInput {
  battleId?: string | null
  templateId?: string | null
  modelProvider: string
  modelId: string
  promptHash: string
  passed: boolean
  durationMs: number | null
  rawOutput?: unknown
  violations?: string[]
}

export interface ModelTestRunRecord {
  id: string
  battle_id: string | null
  template_id: string | null
  model_provider: string
  model_id: string
  prompt_hash: string
  passed: boolean
  duration_ms: number | null
  raw_output: unknown
  violations: string[]
  created_at: string
}

// Phase BK — media quality results -------------------------------------------
export interface MediaQualityResultRecord {
  submission_id: string
  passed: boolean
  violations: string[]
  checked_at: string
}

// Phase BM — vote hardening ---------------------------------------------------
export interface MyVoteRecord {
  contender_id: string | null
  vote_value: string
  updated_at: string
}

// Phase BP — browse ----------------------------------------------------------
export interface BrowseFilters {
  category?: string | null
  status?: string | null
  q?: string | null
}

export interface BrowseCursor {
  created_at: string
  id: string
}

export interface BrowseBattleRecord {
  id: string
  title: string
  slug: string
  status: string
  category: string | null
  contender_count: number
  vote_count: number
  created_at: string
  template_title: string | null
}

// --- Supabase Implementation ---

export class SupabaseBattlesRepository implements BattlesRepositoryPort {
  private handleError(error: unknown) {
    const e = error as { code?: string; message?: string }
    if (!e) return
    if (e.code === 'PGRST116') throw new Error('Battle not found.')
    throw error
  }

  private readonly battleSelect =
    'id, slug, title, task_prompt, status, total_vote_count, published_at, voting_opens_at, voting_closes_at, battle_type, voter_eligibility, handicap_config, creator_lenser_id, forum_thread_id, workflow_id, lens_id, execution_starts_at, auto_publish, voting_duration_hours, vote_velocity, og_image_url'

  async getBattleBySlug(slug: string): Promise<BattleRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_battle_by_slug', { p_slug: slug })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as BattleRecord | null
  }

  async getBattlesFeed(filter?: string, limit = 20, battleType?: BattleType, cursor?: string, sortBy: 'newest' | 'most_votes' | 'trending' = 'newest'): Promise<BattleRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battles_feed', {
      p_status: filter && filter !== 'all' ? filter : null,
      p_battle_type: battleType ?? null,
      p_limit: limit,
      p_cursor: cursor ?? null,
    })
    if (error) this.handleError(error)
    return (data ?? []) as BattleRecord[]
  }

  async getContenders(battleId: string): Promise<ContenderRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battle_contenders', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as ContenderRecord[]
  }

  async getSubmissions(battleId: string): Promise<SubmissionRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battle_submissions', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as SubmissionRecord[]
  }

  async getVoteAggregates(battleId: string): Promise<VoteAggregateRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_vote_aggregates', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as VoteAggregateRecord[]
  }

  async getScorecards(battleId: string): Promise<ScorecardRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battle_scorecards', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as ScorecardRecord[]
  }

  async getRubricCriteria(criterionIds: string[]): Promise<RubricCriterionRecord[]> {
    if (criterionIds.length === 0) return []
    const { data, error } = await supabase.rpc('fn_get_rubric_criteria', {
      p_criterion_ids: criterionIds,
    })
    if (error) this.handleError(error)
    return (data ?? []) as RubricCriterionRecord[]
  }

  async getMyVote(battleId: string): Promise<{ vote_value: string } | null> {
    const { data, error } = await supabase.rpc('fn_get_my_vote', { p_battle_id: battleId })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as { vote_value: string } | null
  }

  async submitVote(input: SubmitVoteInput): Promise<{ vote_id: string; status: string; battle_id: string }> {
    const { data, error } = await supabase.rpc('fn_submit_vote', {
      p_battle_id: input.battle_id,
      p_voted_contender_id: input.voted_contender_id,
      p_vote_value: input.vote_value,
      p_is_draw: input.is_draw ?? input.vote_value === 'draw',
      p_rationale: input.rationale ?? null,
    })
    if (error) {
      // P0429 / RATE_LIMIT: propagate as-is so the mutation hook / feature layer can call
      // handleRateLimitError and show a toast. The repository must not import UI-layer handlers.
      this.handleError(error)
    }
    return data as { vote_id: string; status: string; battle_id: string }
  }

  async getBattlesFeedItems(options?: BattlesFeedOptions): Promise<BattleFeedItemRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battles_feed', {
      p_status: options?.status ?? null,
      p_battle_type: options?.battleType ?? null,
      p_limit: options?.limit ?? 20,
      p_cursor: options?.cursor ?? null,
    })
    if (error) this.handleError(error)
    return (data ?? []) as BattleFeedItemRecord[]
  }

  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) +
      '-' +
      Math.random().toString(36).slice(2, 8)
    )
  }

  async createBattle(input: CreateBattleInput): Promise<BattleRecord> {
    const { data, error } = await supabase.rpc('fn_battles_create', {
      p_title: input.title,
      p_slug: this.generateSlug(input.title),
      p_task_prompt: input.task_prompt,
      p_rubric_id: null,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as BattleRecord
  }

  async updateBattle(id: string, input: Partial<CreateBattleInput>): Promise<BattleRecord> {
    const { data, error } = await supabase.rpc('fn_update_battle', {
      p_battle_id: id,
      p_title: input.title ?? null,
      p_task_prompt: input.task_prompt ?? null,
      p_battle_type: input.battle_type ?? null,
      p_voter_eligibility: input.voter_eligibility ?? null,
      p_handicap_config: input.handicap ?? null,
      p_workflow_id: input.workflow_id ?? null,
      p_lens_id: input.lens_id ?? null,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as BattleRecord
  }

  async getLatestDraftBattleByWorkflowId(workflowId: string): Promise<BattleRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_latest_draft_battle_by_workflow', {
      p_workflow_id: workflowId,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as BattleRecord | null
  }

  async getAIHandicapPolicy(battleId: string): Promise<AIHandicapPolicyRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_ai_handicap_policy', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as AIHandicapPolicyRecord | null
  }

  async checkVoterEligibility(battleId: string, lenserId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('fn_check_voter_eligibility', {
      p_battle_id: battleId,
      p_lenser_id: lenserId,
    })
    if (error) return false
    return data === true
  }

  async publishBattle(battleId: string): Promise<BattleRecord> {
    const { error: publishErr } = await supabase.rpc('fn_publish_battle', {
      p_battle_id: battleId,
    })
    if (publishErr) this.handleError(publishErr)
    const { data: updated, error: fetchErr } = await supabase.rpc('fn_get_battle', {
      p_battle_id: battleId,
    })
    if (fetchErr) this.handleError(fetchErr)
    const row = Array.isArray(updated) ? updated[0] : updated
    return row as BattleRecord
  }

  async getBattleComments(battleId: string, limit = 50, cursor?: ChatCursor): Promise<BattleCommentRecord[]> {
    // Cross-schema join (battles.comments → lensers.profiles) is done server-side via
    // fn_get_battle_comments to avoid PostgREST schema-cache poisoning (PGRST200).
    // RPC returns DESC (newest first from cursor); we reverse to chronological order.
    const { data, error } = await supabase.rpc('fn_get_battle_comments', {
      p_battle_id: battleId,
      p_limit: limit,
      p_before_ts: cursor?.before_ts ?? null,
      p_before_id: cursor?.before_id ?? null,
    })
    if (error) this.handleError(error)
    return ((data ?? []) as BattleCommentRecord[]).reverse()
  }

  async postComment(battleId: string, lenserId: string, body: string): Promise<BattleCommentRecord> {
    const { data, error } = await supabase.rpc('fn_post_battle_comment', {
      p_battle_id: battleId,
      p_lenser_id: lenserId,
      p_body: body,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as BattleCommentRecord
  }

  async getGlobalMessages(battleId: string, limit = 50, cursor?: ChatCursor): Promise<GlobalMessageRecord[]> {
    // RPC returns DESC (newest first from cursor); we reverse to chronological order.
    const { data, error } = await supabase.rpc('fn_get_global_messages', {
      p_battle_id: battleId,
      p_limit: limit,
      p_before_ts: cursor?.before_ts ?? null,
      p_before_id: cursor?.before_id ?? null,
    })
    if (error) this.handleError(error)
    return ((data ?? []) as GlobalMessageRecord[]).reverse()
  }

  async postGlobalMessage(
    battleId: string,
    _senderId: string,
    senderHandle: string,
    senderRole: string,
    body: string
  ): Promise<GlobalMessageRecord> {
    const { data, error } = await supabase.rpc('fn_post_global_message', {
      p_battle_id: battleId,
      p_body: body,
      p_sender_handle: senderHandle,
      p_sender_role: senderRole,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as GlobalMessageRecord
  }

  async removeContender(contenderId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_remove_battle_contender', {
      p_contender_id: contenderId,
    })
    if (error) this.handleError(error)
  }

  async inviteContender(input: InviteContenderInput): Promise<ContenderRecord> {
    const { data, error } = await supabase.rpc('fn_invite_battle_contender', {
      p_battle_id: input.battle_id,
      p_slot: input.slot,
      p_contender_type: input.contender_type,
      p_contender_ref_id: input.contender_ref_id,
      p_display_name: input.display_name,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as ContenderRecord
  }

  async submitContenderEntry(
    battleId: string,
    contenderId: string,
    contentText: string,
    // TODO: caller should invoke contentModerationService.validate before calling this.
    validate?: (text: string) => Promise<void>,
  ): Promise<SubmissionRecord> {
    if (validate) await validate(contentText)
    const { data, error } = await supabase.rpc('fn_battles_submit', {
      p_battle_id: battleId,
      p_content_text: contentText,
      p_content_url: null,
      p_content_media: null,
      p_execution_run_id: null,
      p_artifact_id: null,
      p_source_type: 'text',
      p_adapter_id: null,
      p_model_id: null,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as SubmissionRecord
  }

  async linkForumThread(battleId: string, forumThreadId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_battles_link_forum_thread', {
      p_battle_id: battleId,
      p_forum_thread_id: forumThreadId,
    })
    if (error) this.handleError(error)
  }

  async assignLensToContender(input: AssignLensInput): Promise<ContenderLensAssignmentRecord> {
    const { data, error } = await supabase.rpc('fn_assign_lens_to_contender', {
      p_contender_id:   input.contender_id,
      p_battle_id:      input.battle_id,
      p_lens_id:        input.lens_id,
      p_version_id:     input.version_id ?? null,
      p_input_snapshot: input.input_snapshot ?? {},
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as ContenderLensAssignmentRecord
  }

  async getLensAssignment(contenderId: string): Promise<ContenderLensAssignmentRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_lens_assignment', {
      p_contender_id: contenderId,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as ContenderLensAssignmentRecord | null
  }

  async openVoting(battleId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_battle_open_voting', { p_battle_id: battleId })
    if (error) this.handleError(error)
  }

  async closeVoting(battleId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_battle_close_voting', { p_battle_id: battleId })
    if (error) this.handleError(error)
  }

  async scheduleBattle(input: ScheduleBattleInput): Promise<BattleRecord> {
    const { error } = await supabase.rpc('fn_schedule_battle', {
      p_battle_id: input.battle_id,
      p_execution_starts_at: input.execution_starts_at,
      p_voting_duration_hours: input.voting_duration_hours ?? 24,
      p_auto_publish: input.auto_publish ?? true,
    })
    if (error) this.handleError(error)
    const { data: updated, error: fetchErr } = await supabase.rpc('fn_get_battle', {
      p_battle_id: input.battle_id,
    })
    if (fetchErr) this.handleError(fetchErr)
    const row = Array.isArray(updated) ? updated[0] : updated
    return row as BattleRecord
  }

  async getBattleExecutionJobs(battleId: string): Promise<BattleExecutionJobRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battle_execution_jobs', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as BattleExecutionJobRecord[]
  }

  async getTrendingBattles(options?: TrendingBattlesOptions): Promise<TrendingBattleRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_trending_battles', {
      p_limit:  options?.limit ?? 20,
      p_cursor: options?.cursor ?? null,
    })
    if (error) this.handleError(error)
    return (data ?? []) as TrendingBattleRecord[]
  }

  async getAiJudgeVerdicts(battleId: string): Promise<AiJudgeVerdictRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_ai_judge_verdicts', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as AiJudgeVerdictRecord[]
  }

  async getDLQEntries(opts?: { battleId?: string; unresolvedOnly?: boolean; limit?: number }): Promise<DLQEntryRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battle_dlq_entries', {
      p_battle_id: opts?.battleId ?? null,
      p_unresolved_only: opts?.unresolvedOnly ?? false,
      p_limit: opts?.limit ?? 50,
    })
    if (error) this.handleError(error)
    return (data ?? []) as DLQEntryRecord[]
  }

  async retryDLQEntry(deadLetterId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_retry_dead_letter_battle_job', {
      p_dead_letter_id: deadLetterId,
    })
    if (error) this.handleError(error)
  }

  async getPublicExecutionJobs(battleId: string): Promise<PublicExecutionJobRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_battle_execution_jobs', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as PublicExecutionJobRecord[]
  }

  async listBattleTemplates(): Promise<BattleTemplateRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_battle_templates', { p_limit: 100 })
    if (error) this.handleError(error)
    return (data ?? []) as BattleTemplateRecord[]
  }

  async listPublicBattleTemplates(category?: string, limit = 20): Promise<BattleTemplateRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_public_battle_templates', {
      p_category: category ?? null,
      p_limit: limit,
    })
    if (error) this.handleError(error)
    return (data ?? []) as BattleTemplateRecord[]
  }

  async toggleBattleTemplatePublic(id: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase.rpc('fn_toggle_battle_template_public', {
      p_template_id: id,
      p_is_public: isPublic,
    })
    if (error) this.handleError(error)
  }

  async createBattleFromTemplate(templateId: string, title: string, slug: string): Promise<string> {
    const { data, error } = await supabase.rpc('fn_battles_create_from_template', {
      p_template_id: templateId,
      p_title: title,
      p_slug: slug,
    })
    if (error) this.handleError(error)
    return data as string
  }

  async createTemplate(input: CreateTemplateInput): Promise<BattleTemplateRecord> {
    const { data, error } = await supabase.rpc('fn_battles_create_template', {
      p_title: input.title,
      p_description: input.description ?? null,
      p_task_prompt: input.taskPrompt,
      p_category: input.category ?? null,
      p_max_contenders: input.maxContenders ?? 2,
      p_is_public: input.isPublic ?? false,
    })
    if (error) this.handleError(error)
    return data as BattleTemplateRecord
  }

  async updateTemplate(id: string, input: Partial<CreateTemplateInput>): Promise<BattleTemplateRecord> {
    const { data, error } = await supabase.rpc('fn_battles_update_template', {
      p_template_id: id,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_task_prompt: input.taskPrompt ?? null,
      p_category: input.category ?? null,
      p_max_contenders: input.maxContenders ?? null,
      p_is_public: input.isPublic ?? null,
    })
    if (error) this.handleError(error)
    return data as BattleTemplateRecord
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_battles_delete_template', {
      p_template_id: id,
    })
    if (error) this.handleError(error)
  }

  async getTemplateById(id: string): Promise<BattleTemplateRecord> {
    const { data, error } = await supabase.rpc('fn_battles_get_template', {
      p_template_id: id,
    })
    if (error) this.handleError(error)
    return data as BattleTemplateRecord
  }

  async submitMediaEntry(
    battleId: string,
    contenderId: string,
    mediaUrl: string,
    mimeType: string,
    outputModality: SubmissionOutputModality
  ): Promise<SubmissionRecord> {
    const { data, error } = await supabase.rpc('fn_battles_submit_media', {
      p_battle_id: battleId,
      p_contender_id: contenderId,
      p_media_url: mediaUrl,
      p_mime_type: mimeType,
      p_output_modality: outputModality,
    })
    if (error) this.handleError(error)
    return data as SubmissionRecord
  }

  async uploadSubmissionMedia(
    battleId: string,
    contenderId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<{ publicUrl: string; mimeType: string; outputModality: SubmissionOutputModality }> {
    const path = `${battleId}/${contenderId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    onProgress?.(0)
    const { error: uploadError } = await supabase.storage
      .from('battles-media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
    if (uploadError) throw uploadError
    onProgress?.(80)

    const { data: signed, error: signError } = await supabase.storage
      .from('battles-media')
      .createSignedUrl(path, 60 * 60 * 24)
    if (signError) throw signError

    const mt = file.type || 'application/octet-stream'
    const modality: SubmissionOutputModality = mt.startsWith('image/')
      ? 'image'
      : mt.startsWith('video/')
        ? 'video'
        : mt.startsWith('audio/')
          ? 'audio'
          : 'text'
    if (modality === 'text') {
      throw new Error(`unsupported_mime: ${mt}`)
    }
    onProgress?.(100)
    return { publicUrl: signed.signedUrl, mimeType: mt, outputModality: modality }
  }

  // Phase BH — battle series
  async createSeries(templateId: string, title: string, roundCount = 3): Promise<BattleSeriesRecord> {
    const { data, error } = await supabase.rpc('fn_create_battle_series', {
      p_template_id: templateId,
      p_title: title,
      p_round_count: roundCount,
    })
    if (error) this.handleError(error)
    return data as BattleSeriesRecord
  }

  async advanceSeries(seriesId: string): Promise<BattleSeriesRecord> {
    const { data, error } = await supabase.rpc('fn_advance_series', {
      p_series_id: seriesId,
    })
    if (error) this.handleError(error)
    return data as BattleSeriesRecord
  }

  async getSeries(seriesId: string): Promise<SeriesRoundRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_series', {
      p_series_id: seriesId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as SeriesRoundRecord[]
  }

  // Phase BJ — model conformance ---------------------------------------------
  async logModelTestRun(input: LogModelTestRunInput): Promise<ModelTestRunRecord> {
    const { data, error } = await supabase.rpc('fn_log_model_test_run', {
      p_battle_id:      input.battleId ?? null,
      p_template_id:    input.templateId ?? null,
      p_model_provider: input.modelProvider,
      p_model_id:       input.modelId,
      p_prompt_hash:    input.promptHash,
      p_passed:         input.passed,
      p_duration_ms:    input.durationMs ?? null,
      p_raw_output:     input.rawOutput ?? null,
      p_violations:     input.violations ?? [],
    })
    if (error) this.handleError(error)
    return data as ModelTestRunRecord
  }

  async getModelTestRuns(battleId: string, limit = 50): Promise<ModelTestRunRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_model_test_runs', {
      p_battle_id: battleId,
      p_limit:     limit,
    })
    if (error) this.handleError(error)
    return (data ?? []) as ModelTestRunRecord[]
  }

  // Phase BK — media quality gates -------------------------------------------
  async checkMediaQuality(submissionId: string): Promise<MediaQualityResultRecord> {
    const { data, error } = await supabase.rpc('fn_check_media_quality', {
      p_submission_id: submissionId,
    })
    if (error) this.handleError(error)
    return data as MediaQualityResultRecord
  }

  // Phase BM — vote hardening ------------------------------------------------
  async getMyVoteFull(battleId: string): Promise<MyVoteRecord | null> {
    const { data, error } = await supabase.rpc('fn_battles_get_my_vote', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as MyVoteRecord | null
  }

  async changeVote(battleId: string, newContenderId: string): Promise<{ vote_id: string; updated_at: string }> {
    const { data, error } = await supabase.rpc('fn_battles_change_vote', {
      p_battle_id:        battleId,
      p_new_contender_id: newContenderId,
    })
    if (error) this.handleError(error)
    return data as { vote_id: string; updated_at: string }
  }

  // Phase BN — structured template prompts -----------------------------------
  async renderTemplatePrompt(templateId: string, variables: Record<string, string>): Promise<string> {
    const { data, error } = await supabase.rpc('fn_battles_render_prompt', {
      p_template_id: templateId,
      p_variables:   variables,
    })
    if (error) this.handleError(error)
    return (data ?? '') as string
  }

  // Phase BP — browse --------------------------------------------------------
  async browseBattles(
    filters: BrowseFilters,
    cursor?: BrowseCursor,
    limit = 20,
  ): Promise<BrowseBattleRecord[]> {
    const { data, error } = await supabase.rpc('fn_browse_battles', {
      p_category:      filters.category ?? null,
      p_status:        filters.status ?? null,
      p_q:             filters.q ?? null,
      p_after_created: cursor?.created_at ?? null,
      p_after_id:      cursor?.id ?? null,
      p_limit:         Math.min(Math.max(limit, 1), 100),
    })
    if (error) this.handleError(error)
    return (data ?? []) as BrowseBattleRecord[]
  }

  // Phase BX — retention CTA -------------------------------------------------
  async nextRecommendation(battleId: string): Promise<NextRecommendation | null> {
    const { data, error } = await supabase.rpc('fn_battles_next_recommendation', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    if (data == null) return null
    return data as NextRecommendation
  }
}

export const battlesRepository = new SupabaseBattlesRepository()
