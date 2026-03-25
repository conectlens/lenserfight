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

// --- Port ---

export interface BattlesRepositoryPort {
  getBattleBySlug(slug: string): Promise<BattleRecord | null>
  getBattlesFeed(filter?: string, limit?: number): Promise<BattleRecord[]>
  getContenders(battleId: string): Promise<ContenderRecord[]>
  getSubmissions(battleId: string): Promise<SubmissionRecord[]>
  getVoteAggregates(battleId: string): Promise<VoteAggregateRecord[]>
  getScorecards(battleId: string): Promise<ScorecardRecord[]>
  getRubricCriteria(criterionIds: string[]): Promise<RubricCriterionRecord[]>
  submitVote(input: SubmitVoteInput): Promise<void>
}

// --- Supabase Implementation ---

export class SupabaseBattlesRepository implements BattlesRepositoryPort {
  private handleError(error: unknown) {
    const e = error as { code?: string; message?: string }
    if (!e) return
    if (e.code === 'PGRST116') throw new Error('Battle not found.')
    throw error
  }

  async getBattleBySlug(slug: string): Promise<BattleRecord | null> {
    const { data, error } = await supabase
      .schema('battles')
      .from('battles')
      .select('id, slug, title, task_prompt, status, total_vote_count, published_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as BattleRecord | null
  }

  async getBattlesFeed(filter?: string, limit = 50): Promise<BattleRecord[]> {
    let query = supabase
      .schema('battles')
      .from('battles')
      .select('id, slug, title, task_prompt, status, total_vote_count, published_at')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (filter && filter !== 'all') {
      query = query.eq('status', filter)
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

  async submitVote(input: SubmitVoteInput): Promise<void> {
    const row = {
      battle_id: input.battle_id,
      voter_lenser_id: input.voter_lenser_id,
      vote_value: input.vote_value,
      voted_contender_id: input.voted_contender_id,
      rationale: input.rationale ?? null,
      is_draw: input.is_draw ?? input.vote_value === 'draw',
      weight: 1,
    }

    const { error } = await supabase.schema('battles').from('votes').insert(row)
    if (error) this.handleError(error)
  }
}
