export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Reversibility = 'REVERSIBLE' | 'PARTIAL' | 'IRREVERSIBLE'

/**
 * NONE     — No gate. Operation proceeds silently (informational audit entry only).
 * FLAG     — User must pass an explicit flag (--force / --confirm / --yes).
 *            In CI this is the only way to proceed; interactive TTY gets the flag hint.
 * TYPED    — Interactive TTY: user must type a specific phrase.
 *            CI / non-TTY: blocked unless --force is also provided.
 * COUNTDOWN — Interactive TTY: 5-second countdown with Ctrl-C abort window.
 *             CI / non-TTY: blocked unless --force is also provided.
 */
export type ConfirmationPolicy = 'NONE' | 'FLAG' | 'TYPED' | 'COUNTDOWN'

export type ResourceType =
  | 'platform'
  | 'database'
  | 'config'
  | 'agent'
  | 'battle'
  | 'community'
  | 'credential'
  | 'execution'
  | 'schedule'
  | string // extensible — prefer the named literals above

export type ResourceScope = 'local' | 'remote' | 'production' | 'all'

export interface AffectedResource {
  type: ResourceType
  name: string
  scope: ResourceScope
}

export interface SafetyGateOptions {
  /** One-sentence description of what will happen. */
  description: string
  risk: RiskLevel
  reversibility: Reversibility
  confirmationPolicy: ConfirmationPolicy

  /** Resources visibly affected by this operation. */
  affectedResources?: AffectedResource[]

  /** True if --dry-run is available on this command. */
  dryRunSupported?: boolean

  /** True if a rollback procedure exists. */
  rollbackAvailable?: boolean

  /** Display name of the bypass flag shown to users, e.g. '--force', '--confirm'. */
  forceFlag?: string

  /** Was the bypass flag provided in the current invocation? */
  hasForce?: boolean

  /** Phrase the user must type exactly (TYPED policy). */
  typedPhrase?: string

  /** Countdown duration in seconds (COUNTDOWN policy, default: 5). */
  countdownSeconds?: number

  /** Extra context lines appended to the impact summary. */
  notes?: string[]
}
