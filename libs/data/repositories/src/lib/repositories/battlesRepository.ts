import { supabase } from '@lenserfight/data/supabase'

// --- Types ---

export type BattleStatus =
  | 'draft'
  | 'open'
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

export type VoterEligibility = 'open' | 'human_only' | 'ai_only' | 'verified_lenser'

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
  battle_type: BattleType
  voter_eligibility: VoterEligibility
  handicap_config: Record<string, unknown>
  creator_lenser_id: string | null
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
}

export interface ContenderRecord {
  id: string
  battle_id: string
  slot: 'A' | 'B'
  contender_type: ContenderType
  display_name: string
}

export interface SubmissionRecord {
  id: string
  battle_id: string
  contender_id: string
  content_text: string | null
  content_url: string | null
  status: string
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
  contender_a_id: string | null
  contender_a_name: string | null
  contender_a_type: ContenderType | null
  contender_b_id: string | null
  contender_b_name: string | null
  contender_b_type: ContenderType | null
  winner_slot: 'A' | 'B' | null
}

export interface BattlesFeedOptions {
  status?: string
  battleType?: BattleType
  limit?: number
  cursor?: string
}

export interface BattlesRepositoryPort {
  getBattleBySlug(slug: string): Promise<BattleRecord | null>
  getBattlesFeed(filter?: string, limit?: number, battleType?: BattleType): Promise<BattleRecord[]>
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
  getGlobalMessages(battleId: string, limit?: number): Promise<GlobalMessageRecord[]>
  postGlobalMessage(battleId: string, senderId: string, senderHandle: string, senderRole: string, body: string): Promise<GlobalMessageRecord>
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
    'id, slug, title, task_prompt, status, total_vote_count, published_at, battle_type, voter_eligibility, handicap_config, creator_lenser_id'

  async getBattleBySlug(slug: string): Promise<BattleRecord | null> {
    const { data, error } = await supabase
      .schema('battles')
      .from('battles')
      .select(this.battleSelect)
      .eq('slug', slug)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as BattleRecord | null
  }

  async getBattlesFeed(filter?: string, limit = 50, battleType?: BattleType): Promise<BattleRecord[]> {
    let query = supabase
      .schema('battles')
      .from('battles')
      .select(this.battleSelect)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (filter && filter !== 'all') {
      query = query.eq('status', filter)
    }
    if (battleType) {
      query = query.eq('battle_type', battleType)
    }

    const { data, error } = await query
    if (error) this.handleError(error)
    return (data ?? []) as BattleRecord[]
  }

  async getContenders(battleId: string): Promise<ContenderRecord[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('contenders')
      .select('id, battle_id, slot, contender_type, display_name')
      .eq('battle_id', battleId)

    if (error) this.handleError(error)
    return (data ?? []) as ContenderRecord[]
  }

  async getSubmissions(battleId: string): Promise<SubmissionRecord[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('submissions')
      .select('id, battle_id, contender_id, content_text, content_url, status')
      .eq('battle_id', battleId)

    if (error) this.handleError(error)
    return (data ?? []) as SubmissionRecord[]
  }

  async getVoteAggregates(battleId: string): Promise<VoteAggregateRecord[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('vote_aggregates')
      .select('battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position')
      .eq('battle_id', battleId)

    if (error) this.handleError(error)
    return (data ?? []) as VoteAggregateRecord[]
  }

  async getScorecards(battleId: string): Promise<ScorecardRecord[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('scorecards')
      .select('id, battle_id, contender_id, rubric_criterion_id, result, explanation')
      .eq('battle_id', battleId)

    if (error) this.handleError(error)
    return (data ?? []) as ScorecardRecord[]
  }

  async getRubricCriteria(criterionIds: string[]): Promise<RubricCriterionRecord[]> {
    if (criterionIds.length === 0) return []
    const { data, error } = await supabase
      .schema('battles')
      .from('rubric_criteria')
      .select('id, title, description, weight')
      .in('id', criterionIds)

    if (error) this.handleError(error)
    return (data ?? []) as RubricCriterionRecord[]
  }

  async submitVote(input: SubmitVoteInput): Promise<{ vote_id: string; status: string; battle_id: string }> {
    const { data, error } = await supabase.rpc('fn_submit_vote', {
      p_battle_id: input.battle_id,
      p_voted_contender_id: input.voted_contender_id,
      p_vote_value: input.vote_value,
      p_is_draw: input.is_draw ?? input.vote_value === 'draw',
      p_rationale: input.rationale ?? null,
    })
    if (error) this.handleError(error)
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

  async createBattle(input: CreateBattleInput): Promise<BattleRecord> {
    // Calls the atomic fn_create_battle RPC which inserts battles + ai_handicap_policies + funding_policies.
    // Until the RPC is deployed, falls back to direct insert with defaults.
    const { data, error } = await supabase
      .schema('battles')
      .from('battles')
      .insert({
        title: input.title,
        task_prompt: input.task_prompt,
        battle_type: input.battle_type,
        voter_eligibility: input.voter_eligibility,
        handicap_config: input.handicap ?? {},
        status: 'draft',
      })
      .select(this.battleSelect)
      .single()

    if (error) this.handleError(error)
    return data as BattleRecord
  }

  async getAIHandicapPolicy(battleId: string): Promise<AIHandicapPolicyRecord | null> {
    const { data, error } = await supabase
      .schema('battles')
      .from('ai_handicap_policies')
      .select('id, battle_id, max_tokens_per_second, injected_delay_ms, max_context_tokens, allowed_model_tier, time_budget_ms')
      .eq('battle_id', battleId)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as AIHandicapPolicyRecord | null
  }

  async checkVoterEligibility(battleId: string, lenserId: string): Promise<boolean> {
    // Reads battle voter_eligibility and compares to lenser profile type.
    const { data: battle, error: battleErr } = await supabase
      .schema('battles')
      .from('battles')
      .select('voter_eligibility')
      .eq('id', battleId)
      .maybeSingle()

    if (battleErr || !battle) return false
    if (battle.voter_eligibility === 'open') return true

    const { data: profile, error: profileErr } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('type, onboarding_step')
      .eq('id', lenserId)
      .maybeSingle()

    if (profileErr || !profile) return false

    if (battle.voter_eligibility === 'human_only') return profile.type === 'human'
    if (battle.voter_eligibility === 'ai_only') return profile.type === 'ai'
    if (battle.voter_eligibility === 'verified_lenser') return profile.onboarding_step === 'completed'

    return true
  }

  async publishBattle(battleId: string): Promise<BattleRecord> {
    const { data, error } = await supabase.rpc('fn_publish_battle', {
      p_battle_id: battleId,
    })
    if (error) this.handleError(error)
    // fn_publish_battle returns a jsonb snapshot; re-fetch the updated record
    const { data: updated, error: fetchErr } = await supabase
      .schema('battles')
      .from('battles')
      .select(this.battleSelect)
      .eq('id', battleId)
      .single()
    if (fetchErr) this.handleError(fetchErr)
    return updated as BattleRecord
  }

  async getBattleComments(battleId: string, limit = 100): Promise<BattleCommentRecord[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('comments')
      .select(`
        id,
        battle_id,
        lenser_id,
        body,
        created_at,
        updated_at,
        lenser:lenser_id (
          handle,
          display_name,
          avatar_url
        )
      `)
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) this.handleError(error)
    return ((data ?? []) as unknown[]).map((row: unknown) => {
      const r = row as Record<string, unknown>
      const lenser = r['lenser'] as Record<string, unknown> | null
      return {
        id: r['id'] as string,
        battle_id: r['battle_id'] as string,
        lenser_id: r['lenser_id'] as string,
        body: r['body'] as string,
        created_at: r['created_at'] as string,
        updated_at: r['updated_at'] as string,
        lenser_handle: lenser?.['handle'] as string | undefined,
        lenser_display_name: lenser?.['display_name'] as string | undefined,
        lenser_avatar_url: lenser?.['avatar_url'] as string | null | undefined,
      } satisfies BattleCommentRecord
    })
  }

  async postComment(battleId: string, lenserId: string, body: string): Promise<BattleCommentRecord> {
    const { data, error } = await supabase
      .schema('battles')
      .from('comments')
      .insert({ battle_id: battleId, lenser_id: lenserId, body })
      .select('id, battle_id, lenser_id, body, created_at, updated_at')
      .single()
    if (error) this.handleError(error)
    return data as BattleCommentRecord
  }

  async getGlobalMessages(battleId: string, limit = 100): Promise<GlobalMessageRecord[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('global_messages')
      .select('id, battle_id, sender_id, sender_handle, sender_role, body, created_at')
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) this.handleError(error)
    return (data ?? []) as GlobalMessageRecord[]
  }

  async postGlobalMessage(
    battleId: string,
    senderId: string,
    senderHandle: string,
    senderRole: string,
    body: string
  ): Promise<GlobalMessageRecord> {
    const { data, error } = await supabase
      .schema('battles')
      .from('global_messages')
      .insert({ battle_id: battleId, sender_id: senderId, sender_handle: senderHandle, sender_role: senderRole, body })
      .select('id, battle_id, sender_id, sender_handle, sender_role, body, created_at')
      .single()
    if (error) this.handleError(error)
    return data as GlobalMessageRecord
  }
}
