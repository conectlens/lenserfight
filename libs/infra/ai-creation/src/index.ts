// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  GenerationType,
  ProfileAIPreference,
  LensCreationContext,
  WorkflowCreationContext,
  AICreationInput,
  GeneratedLensResult,
  GeneratedWorkflowResult,
  AICreationOutput,
  AICreationError,
  AICreationErrorCode,
  AICreationResult,
  GenerateCreationRequest,
  GenerateCreationResponse,
  GenerateCreationErrorResponse,
} from './lib/creation.types'

// ─── Prompt builders (used by edge function) ─────────────────────────────────
export {
  MAX_PROMPT_LENGTH,
  MAX_CONTEXT_TOKENS,
  buildLensPromptedMessages,
  buildLensRecommendationMessages,
  buildWorkflowPromptedMessages,
  buildWorkflowRecommendationMessages,
} from './lib/creation-prompts'

// ─── Output parser (used by edge function) ───────────────────────────────────
export { parseCreationOutput } from './lib/output-parser'

// ─── Profile AI preference resolver ──────────────────────────────────────────
export { ProfileAIPreferenceResolver, PREFERENCE_FALLBACK } from './lib/profile-ai-preference.resolver'

// ─── Core service (local BYOK path) ──────────────────────────────────────────
export { AICreationService } from './lib/ai-creation.service'

// ─── React hook (all paths, including edge function routing) ─────────────────
export type {
  UseAICreationGenerationOptions,
  UseAICreationGenerationResult,
} from './lib/hooks/useAICreationGeneration'
export { useAICreationGeneration } from './lib/hooks/useAICreationGeneration'
