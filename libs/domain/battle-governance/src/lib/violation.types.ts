/**
 * Battle creation violation types.
 *
 * Follows the ContractViolation pattern from @lenserfight/domain/lens-governance
 * but specialized for battle creation validation.
 */

export type BattleViolationCode =
  | 'FORMAT_TYPE_INCOMPATIBLE'
  | 'CONTENT_TYPE_MODEL_INCOMPATIBLE'
  | 'CONTENT_TYPE_HUMAN_INCOMPATIBLE'
  | 'JUDGING_CONTENT_INCOMPATIBLE'
  | 'LENS_PARAMS_MISSING'
  | 'LENS_PARAMS_INCOMPLETE'
  | 'LENSER_POLICY_INVALID'
  | 'CONTENDER_CAPABILITY_MISMATCH'
  // V2 violation codes (concept separation refactor)
  | 'TASK_SOURCE_CONTENDER_INCOMPATIBLE'
  | 'CONTENDER_JUDGING_INCOMPATIBLE'
  | 'CHALLENGE_TYPE_INVALID'
  | 'CHALLENGE_TYPE_CONTENDER_INCOMPATIBLE'
  // Generated challenge violation codes
  | 'GENERATOR_REQUIRED'
  | 'GENERATOR_MODEL_MISSING'
  | 'GENERATOR_CONTENDER_CONFLICT'
  | 'CHALLENGE_NOT_LOCKED'
  // Benchmark game violation codes
  | 'BENCHMARK_JUDGING_INCOMPATIBLE'
  | 'BENCHMARK_MODEL_CONFLICT'

export type BattleViolationSeverity = 'error' | 'warning'

export interface BattleViolation {
  /** Machine-readable code for programmatic handling. */
  code: BattleViolationCode
  /** The field or aspect that failed validation. */
  field: string
  /** Human-readable explanation shown in UI or CLI. */
  message: string
  /** Whether this blocks creation (error) or just warns (warning). */
  severity: BattleViolationSeverity
}
