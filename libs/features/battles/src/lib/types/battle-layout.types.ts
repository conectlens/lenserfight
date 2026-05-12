import type React from 'react'
import type { Battle, BattleUIPhase, Contender, ContenderLensAssignmentRecord, Submission, VoteAggregate, VoteValue } from './battle.types'
import type { BattleContentRenderer } from './battle-renderer.types'
import type { PublicExecutionJobRecord } from '../hooks/query/useExecutionJobs'
import type { BattleScorecardData } from '../hooks/query/useBattleScorecard'

/**
 * GRASP: Pure Fabrication — carries all resolved battle data to layout components.
 * Avoids each layout re-fetching the same hooks and decouples data fetching
 * (ImmersiveArenaView) from display (layout strategies).
 */
export interface BattleLayoutContext {
  battle: Battle
  currentPhase: BattleUIPhase
  isResult: boolean

  // Contenders: supports N contenders, not just A/B
  contenders: Contender[]
  submissions: Submission[]
  aggregates: VoteAggregate[]
  totalVotes: number

  // Execution state
  executionJobs: PublicExecutionJobRecord[]
  scorecardData?: BattleScorecardData | null

  // Auth
  currentUserId?: string
  isOwner: boolean
  myVote: VoteValue | null

  // Lens assignments keyed by contender_id
  lensAssignments: Record<string, ContenderLensAssignmentRecord | null>

  // Actions
  onVote: (value: VoteValue, rationale: string) => Promise<void>

  // Content renderer (pluggable per content_type)
  renderer: BattleContentRenderer
}

/**
 * GRASP: Polymorphism — each battle variant implements this interface.
 * New layouts can be added to the registry without touching the controller.
 *
 * GRASP: Protected Variations — all layout variation is encapsulated here;
 * callers always depend on this stable interface.
 */
export interface BattleLayoutStrategy {
  readonly layoutId: string
  Layout: React.ComponentType<BattleLayoutContext>
}
