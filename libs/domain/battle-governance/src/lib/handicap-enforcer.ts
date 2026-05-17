/**
 * HandicapEnforcer — pure function enforcing AI handicap policy constraints.
 *
 * GRASP Pure Fabrication: a stateless, testable function that applies handicap
 * rules to execution parameters. Has no side effects and does not call the DB.
 *
 * Apply before `callProvider()` in battle-worker.ts and before
 * `ctx.executeProvider()` in ContenderRunRunner to ensure battles with
 * handicap policies enforce their constraints at execution time.
 */

export interface HandicapParams {
  /** Token count limit for the AI request. Maps to provider max_tokens. */
  max_tokens: number
  /** Sampling temperature (0–2). */
  temperature: number
  /** Model tier: 'free' | 'paid' | 'enterprise'. Used for tier cap enforcement. */
  model_tier?: 'free' | 'paid' | 'enterprise' | null
}

export interface HandicapConfig {
  /** Maximum context tokens allowed. Clamps max_tokens if set. */
  max_context_tokens?: number | null
  /** Allowed model tier ceiling. Throws handicap_violation if exceeded. */
  allowed_model_tier?: 'free' | 'paid' | 'enterprise' | null
  /** Additional delay injected before provider call (ms). For information only; not applied here. */
  injected_delay_ms?: number
  /** Maximum time budget (ms). For information only; not applied here. */
  time_budget_ms?: number | null
}

export type EnforcedParams = Pick<HandicapParams, 'max_tokens' | 'temperature'>

const TIER_ORDER: Record<string, number> = { free: 0, paid: 1, enterprise: 2 }

/**
 * Applies handicap constraints to execution parameters.
 *
 * @returns Enforced params with clamped max_tokens.
 * @throws Error with code 'handicap_violation' if model tier exceeds the cap.
 */
export function enforceHandicap(
  params: HandicapParams,
  handicap: HandicapConfig | null,
): EnforcedParams {
  if (!handicap) {
    return { max_tokens: params.max_tokens, temperature: params.temperature }
  }

  // Tier cap enforcement.
  if (handicap.allowed_model_tier != null && params.model_tier != null) {
    const cap  = TIER_ORDER[handicap.allowed_model_tier] ?? 0
    const tier = TIER_ORDER[params.model_tier]          ?? 0
    if (tier > cap) {
      const err = new Error(
        `handicap_violation: model tier '${params.model_tier}' exceeds allowed cap '${handicap.allowed_model_tier}'`,
      )
      ;(err as NodeJS.ErrnoException).code = 'handicap_violation'
      throw err
    }
  }

  // Token count clamp.
  const max_tokens =
    handicap.max_context_tokens != null
      ? Math.min(params.max_tokens, handicap.max_context_tokens)
      : params.max_tokens

  return { max_tokens, temperature: params.temperature }
}
