export type ContractViolationCode =
  | 'LENS_PARAM_REQUIRED'
  | 'LENS_PARAM_TYPE'
  | 'LENS_PARAM_PROTECTED'
  | 'LENS_PARAM_UNKNOWN'
  | 'LENS_VERSION_NOT_FOUND'
  | 'LENS_VERSION_NEGOTIATION_FAILED'
  | 'LENS_DEPENDENCY_CYCLE'
  | 'LENS_DEPENDENCY_DEPTH_EXCEEDED'
  | 'LENS_BUDGET_EXCEEDED'
  | 'LENS_DEPRECATED_NO_MIGRATION'
  | 'LENS_SIGNATURE_INVALID'
  | 'LENS_SCOPE_INSUFFICIENT'
  | 'LENS_SEMVER_MISMATCH'

export interface ContractViolation {
  code: ContractViolationCode
  parameter?: string
  expected?: unknown
  /** Caller-supplied value; redacted to `'[REDACTED]'` for secret/api-key. */
  received?: unknown
  content_hash?: string
  trace_id?: string
  message: string
}
