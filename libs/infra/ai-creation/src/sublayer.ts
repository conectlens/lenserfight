// Framework-agnostic AI-creation sublayer — safe to import from Node contexts
// (the CLI, edge functions) because it excludes the React hook and the Supabase
// preference resolver, which carry browser/Supabase side effects. Mirrors the
// `@lenserfight/data/local-keys-browser` secondary-entry pattern.

export {
  MAX_PROMPT_LENGTH,
  MAX_CONTEXT_TOKENS,
  buildLensPromptedMessages,
  buildLensRecommendationMessages,
  buildWorkflowPromptedMessages,
  buildWorkflowRecommendationMessages,
  buildBattlePromptedMessages,
  buildBattleRecommendationMessages,
} from './lib/creation-prompts'

export { parseCreationOutput } from './lib/output-parser'

// AICreationService only depends on @lenserfight/providers + the pure builders/parser
// above — no React, no Supabase — so it is safe here for the CLI's local-BYOK path.
export { AICreationService } from './lib/ai-creation.service'

export type {
  GenerationType,
  ProfileAIPreference,
  LensCreationContext,
  WorkflowCreationContext,
  BattleCreationContext,
  AICreationInput,
  GeneratedLensResult,
  GeneratedWorkflowResult,
  GeneratedBattleResult,
  AICreationOutput,
  AICreationError,
  AICreationResult,
} from './lib/creation.types'
