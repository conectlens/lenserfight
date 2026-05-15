export type BattleStatus =
  | 'draft'
  | 'open'
  | 'executing'
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

/**
 * Determines who competes and who judges.
 * - ai_vs_ai: two AI lensers compete, community judges
 * - human_vs_human_ai_votes: two humans compete, AI judge casts weighted votes
 * - human_vs_human_open_votes: two humans compete, community votes openly
 * - human_vs_ai: human vs AI lenser, everyone can vote
 * - lenser_battle: named lensers (human or AI) compete using their own lens, memories, and rules
 */
export type BattleType =
  | 'ai_vs_ai'
  | 'human_vs_human_ai_votes'
  | 'human_vs_human_open_votes'
  | 'human_vs_ai'
  | 'workflow_battle'
  | 'lenser_battle'

/**
 * Who is allowed to cast votes in this battle.
 * - open: any authenticated user
 * - human_only: only lensers with type = 'human'
 * - ai_only: only lensers with type = 'ai' (AI judge mode)
 * - verified_lenser: only lensers who have completed onboarding
 * - lenser_only: only users with a lenser profile (any type)
 */
export type VoterEligibility = 'open' | 'human_only' | 'ai_only' | 'verified_lenser' | 'lenser_only'

export interface AIHandicapConfig {
  max_tokens_per_second?: number | null
  injected_delay_ms?: number
  max_context_tokens?: number | null
  allowed_model_tier?: 'free' | 'paid' | 'enterprise' | null
  time_budget_ms?: number | null
}

export interface Battle {
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
  handicap_config: AIHandicapConfig
  creator_lenser_id: string | null
  forum_thread_id: string | null
  workflow_id: string | null
  lens_id: string | null
  execution_starts_at: string | null
  auto_publish: boolean
  voting_duration_hours: number
  vote_velocity: number
  og_image_url: string | null
  content_type?: string | null
}

export interface BattleExecutionJob {
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

export interface Contender {
  id: string
  battle_id: string
  slot: 'A' | 'B'
  contender_type: ContenderType
  display_name: string
  contender_ref_id: string | null
}

export interface Submission {
  id: string
  battle_id: string
  contender_id: string
  content_text: string | null
  content_url: string | null
  status: string
  media_url?: string | null
  mime_type?: string | null
  output_modality?: 'text' | 'image' | 'video' | 'audio' | null
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
  title: string
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

export type ContenderAssignmentMode = 'manual' | 'auto_agent' | 'battle_required'

export interface RuleSnapshotRecord {
  id: string
  battle_id: string
  snapshot_hash: string
  rules_json: Record<string, unknown>
  created_at: string
  created_by: string | null
}

export interface ContenderEntityMapRecord {
  contender_id: string
  profile_id: string | null
  ai_lenser_id: string | null
  group_id: string | null
}

export interface ContenderLensAssignmentRecord {
  id: string
  battle_id: string
  contender_id: string
  lens_id: string
  version_id: string | null
  assignment_mode: ContenderAssignmentMode
  assigned_at: string
  input_snapshot: Record<string, unknown>
}
