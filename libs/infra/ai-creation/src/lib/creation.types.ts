import type { FundingSource } from '@lenserfight/types'

// ─── Generation target ─────────────────────────────────────────────────────────

export type GenerationType = 'lens' | 'workflow' | 'battle'

// ─── Profile AI preference ─────────────────────────────────────────────────────
// Resolved from lensers.preferences via fn_get_profile_ai_preference.

export interface ProfileAIPreference {
  /** Which funding source to use for AI generation calls. */
  fundingSource: FundingSource
  /** Wire model ID, e.g. 'gpt-4o-mini', 'claude-3-haiku-20240307'. */
  modelId: string
  /** Provider key, e.g. 'openai', 'anthropic', 'google', 'mistral'. */
  providerId: string
  /** UUID of the cloud BYOK key in the ai.keys table. null when not using cloud BYOK. */
  selectedKeyRefId: string | null
  /** Local BYOK key ID from browser IndexedDB. null when not using local BYOK. */
  localKeyId: string | null
}

// ─── Context payloads ─────────────────────────────────────────────────────────
// Callers supply context that shapes both prompted and recommendation-mode output.

export interface LensCreationContext {
  /** Tag slugs the user typically applies — used for recommendation mode. */
  userTagSlugs?: string[]
  /** AI persona from lensers.preferences.ai_persona. */
  userPersona?: string | null
}

export interface WorkflowCreationContext {
  /** IDs of lenses the user owns (for seeding recommendation-mode suggestions). */
  availableLensIds?: string[]
  /** Tag slugs — same as lens context. */
  userTagSlugs?: string[]
  /** AI persona from lensers.preferences.ai_persona. */
  userPersona?: string | null
}

export interface BattleCreationContext {
  /** Lens IDs the user owns — the AI may shape the task around one. */
  availableLensIds?: string[]
  /** Workflow IDs the user owns — the AI may suggest a workflow task source. */
  availableWorkflowIds?: string[]
  /** Tag slugs — same as lens context. */
  userTagSlugs?: string[]
  /** AI persona from lensers.preferences.ai_persona. */
  userPersona?: string | null
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface AICreationInput {
  generationType: GenerationType
  /**
   * Optional user-supplied prompt.
   * null / undefined / empty string → system switches to recommendation mode.
   */
  prompt: string | null | undefined
  /** auth.uid() of the active lenser. */
  profileId: string
  context: LensCreationContext | WorkflowCreationContext | BattleCreationContext
}

// ─── Output shapes ────────────────────────────────────────────────────────────

export interface GeneratedLensResult {
  title: string
  /** Markdown body. May include [[param]] variable syntax. */
  content: string
  description: string
  /** Tag slugs to pre-select in the tag picker. May be empty. */
  suggestedTagSlugs: string[]
  /** Detected parameters (labels only; toolId is assigned in the UI). */
  params: Array<{ label: string }>
}

export interface GeneratedWorkflowResult {
  title: string
  description: string
  /** Lens IDs from WorkflowCreationContext.availableLensIds to pre-check. */
  suggestedLensIds: string[]
}

export interface GeneratedBattleResult {
  title: string
  /** The shared challenge every contender receives. */
  task_prompt: string
  // The fields below are advisory suggestions that pre-fill the battle wizard.
  // Their literal unions mirror @lenserfight/domain/battle-governance
  // (TASK_SOURCES / CONTENDER_STRUCTURES / JUDGING_MODES). Kept local so this
  // generic infra lib stays decoupled from the battle domain. The wizard's
  // compatibility effects coerce any incompatible combination into a valid one.
  suggestedTaskSource?: 'lens' | 'workflow' | 'challenge'
  suggestedContenderStructure?: 'ai_vs_ai' | 'human_vs_human' | 'human_vs_ai'
  suggestedJudgingMode?: 'community_vote' | 'ai_judge' | 'rubric_score' | 'auto_score'
  /** Short challenge-type slug (only when suggestedTaskSource === 'challenge'). */
  suggestedChallengeType?: string | null
}

export type AICreationOutput =
  | { type: 'lens'; result: GeneratedLensResult }
  | { type: 'workflow'; result: GeneratedWorkflowResult }
  | { type: 'battle'; result: GeneratedBattleResult }

// ─── Error codes ──────────────────────────────────────────────────────────────

export type AICreationErrorCode =
  | 'VALIDATION_ERROR'    // malformed input (missing required fields)
  | 'PROMPT_TOO_LONG'     // prompt exceeds MAX_PROMPT_LENGTH
  | 'TIMEOUT'             // provider did not respond within TIMEOUT_MS
  | 'RATE_LIMITED'        // too many requests from this user
  | 'CREDIT_EXHAUSTED'    // platform_credit balance = 0 or BYOK key quota exceeded
  | 'PROVIDER_ERROR'      // provider returned a non-retryable error
  | 'PARSE_ERROR'         // response could not be parsed into expected shape
  | 'NO_LOCAL_KEY'        // byok_local selected but no localKeyId configured
  | 'GATEWAY_ERROR'       // local BYOK gateway unreachable / decryption failed
  | 'UNAUTHORIZED'        // profile mismatch or unauthenticated

export interface AICreationError {
  code: AICreationErrorCode
  message: string
  /** Set for RATE_LIMITED — ms to wait before retrying. */
  retryAfterMs?: number
  /** Set for PROMPT_TOO_LONG. */
  maxLength?: number
}

// ─── Result helper types ──────────────────────────────────────────────────────

export type AICreationResult =
  | { ok: true; output: AICreationOutput; mode: 'prompted' | 'recommendation' }
  | { ok: false; error: AICreationError }

// ─── Edge Function wire types ─────────────────────────────────────────────────
// Shared between the client hook and the generate-creation edge function.

export interface GenerateCreationRequest {
  generation_type: GenerationType
  prompt: string | null
  profile_id: string
  context: LensCreationContext | WorkflowCreationContext | BattleCreationContext
  /** Resolved by the client from profile preference. */
  funding_source: 'platform_credit' | 'user_byok_cloud'
  /** Required when funding_source = 'user_byok_cloud'. */
  key_ref_id?: string | null
  provider_key: string
  model_key: string
}

export interface GenerateCreationResponse {
  ok: true
  output: AICreationOutput
  mode: 'prompted' | 'recommendation'
}

export interface GenerateCreationErrorResponse {
  ok: false
  error: AICreationError
}
