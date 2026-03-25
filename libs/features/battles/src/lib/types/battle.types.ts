export type BattleStatus =
  | 'draft'
  | 'open'
  | 'voting'
  | 'scoring'
  | 'closed'
  | 'published'
  | 'archived'

/**
 * UI phase derived from battle status — drives AnimatePresence transitions.
 * - idle: battle exists but no submissions yet (draft / open)
 * - running: submissions being scored (scoring)
 * - voting: community can vote
 * - result: battle is closed / published
 */
export type BattleUIPhase = 'idle' | 'running' | 'voting' | 'result'

export type ContenderType = 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
export type VoteValue = 'contender_a' | 'contender_b' | 'draw'
export type ScorecardResult = 'pass' | 'fail' | 'partial' | 'skipped'

export interface Battle {
  id: string
  slug: string
  title: string
  task_prompt: string
  status: BattleStatus
  total_vote_count: number
  published_at: string | null
}

export interface Contender {
  id: string
  battle_id: string
  slot: 'A' | 'B'
  contender_type: ContenderType
  display_name: string
}

export interface Submission {
  id: string
  battle_id: string
  contender_id: string
  content_text: string | null
  content_url: string | null
  status: string
}

export interface VoteAggregate {
  battle_id: string
  contender_id: string
  raw_vote_count: number
  weighted_vote_sum: number
  draw_count: number
  rank_position: number | null
}

export interface RubricCriterion {
  id: string
  name: string
  description?: string
  weight: number
}

export interface Scorecard {
  id: string
  battle_id: string
  contender_id: string
  rubric_criterion_id: string
  result: ScorecardResult
  explanation?: string
}
