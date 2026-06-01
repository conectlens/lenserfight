import { callProvider } from '@lenserfight/providers'
import type { ProviderMessage } from '@lenserfight/providers'
import {
  buildBattlePromptedMessages,
  buildBattleRecommendationMessages,
  buildLensParamsMessages,
  buildLensPromptedMessages,
  buildLensRecommendationMessages,
  buildWorkflowPromptedMessages,
  buildWorkflowRecommendationMessages,
  MAX_PROMPT_LENGTH,
} from './creation-prompts'
import { parseCreationOutput } from './output-parser'
import type {
  AICreationError,
  AICreationInput,
  AICreationResult,
  BattleCreationContext,
  LensCreationContext,
  LensParamsCreationContext,
  ProfileAIPreference,
  WorkflowCreationContext,
} from './creation.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000
const MAX_OUTPUT_TOKENS = 1024

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Centralized AI generation service for lens and workflow creation.
 *
 * Handles only the **local BYOK** path directly (key resolved in the browser
 * via the gateway loopback). The platform_credit and user_byok_cloud paths are
 * delegated to the generate-creation Supabase Edge Function by the
 * {@link useAICreationGeneration} hook, which then calls this service with an
 * already-resolved apiKey when the edge function route is unavailable.
 *
 * Both prompted (user provided a prompt) and recommendation (no prompt) modes
 * produce the same output shape and go through the same parsing pipeline.
 */
export class AICreationService {
  static readonly MAX_PROMPT_LENGTH = MAX_PROMPT_LENGTH
  static readonly TIMEOUT_MS = TIMEOUT_MS

  /**
   * @param localKeyResolver  Injected from `useLocalKeyStore().resolveKey`.
   *                          Only called when fundingSource === 'user_byok_local'.
   */
  constructor(
    private readonly localKeyResolver: (keyId: string) => Promise<string>,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate or recommend a lens / workflow using the resolved profile preference.
   *
   * @param input   What to generate and the profile context.
   * @param preference  The caller is responsible for resolving this via
   *                    {@link ProfileAIPreferenceResolver} before calling.
   */
  async generate(input: AICreationInput, preference: ProfileAIPreference): Promise<AICreationResult> {
    // 1. Validate input
    const validationError = this.validateInput(input)
    if (validationError) return { ok: false, error: validationError }

    // 2. Only local BYOK is handled here; server paths are handled by the edge function
    if (preference.fundingSource !== 'user_byok_local') {
      return {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Non-local funding sources must be handled by the generate-creation edge function.',
        },
      }
    }

    if (!preference.localKeyId) {
      return {
        ok: false,
        error: { code: 'NO_LOCAL_KEY', message: 'No local BYOK key is configured in your profile.' },
      }
    }

    // 3. Resolve local key
    let apiKey: string
    try {
      apiKey = await this.localKeyResolver(preference.localKeyId)
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: err instanceof Error ? err.message : 'Failed to resolve local BYOK key.',
        },
      }
    }

    // 4. Build messages
    const mode = input.prompt?.trim() ? 'prompted' : 'recommendation'
    const messages = this.buildMessages(input, mode)

    // 5. Call provider
    return this.callProviderWithTimeout(preference.providerId, preference.modelId, apiKey, messages, input, mode)
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private validateInput(input: AICreationInput): AICreationError | null {
    if (!input.profileId?.trim()) {
      return { code: 'VALIDATION_ERROR', message: 'profileId is required.' }
    }
    if (!input.generationType) {
      return { code: 'VALIDATION_ERROR', message: 'generationType is required.' }
    }
    if (input.prompt && input.prompt.length > MAX_PROMPT_LENGTH) {
      return {
        code: 'PROMPT_TOO_LONG',
        message: `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters.`,
        maxLength: MAX_PROMPT_LENGTH,
      }
    }
    return null
  }

  private buildMessages(
    input: AICreationInput,
    mode: 'prompted' | 'recommendation',
  ): ProviderMessage[] {
    if (input.generationType === 'lens_params') {
      const ctx = (input.context ?? {}) as LensParamsCreationContext
      return buildLensParamsMessages(mode === 'prompted' ? (input.prompt ?? null) : null, ctx)
    }
    if (input.generationType === 'lens') {
      const ctx = (input.context ?? {}) as LensCreationContext
      return mode === 'prompted'
        ? buildLensPromptedMessages(input.prompt!, ctx)
        : buildLensRecommendationMessages(ctx)
    }
    if (input.generationType === 'battle') {
      const ctx = (input.context ?? {}) as BattleCreationContext
      return mode === 'prompted'
        ? buildBattlePromptedMessages(input.prompt!, ctx)
        : buildBattleRecommendationMessages(ctx)
    }
    const ctx = (input.context ?? {}) as WorkflowCreationContext
    return mode === 'prompted'
      ? buildWorkflowPromptedMessages(input.prompt!, ctx)
      : buildWorkflowRecommendationMessages(ctx)
  }

  private async callProviderWithTimeout(
    providerId: string,
    modelId: string,
    apiKey: string,
    messages: ProviderMessage[],
    input: AICreationInput,
    mode: 'prompted' | 'recommendation',
  ): Promise<AICreationResult> {
    const signal = AbortSignal.timeout(TIMEOUT_MS)

    try {
      const response = await callProvider(
        providerId as Parameters<typeof callProvider>[0],
        apiKey,
        modelId,
        messages,
        { maxTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
        signal,
      )

      const output = parseCreationOutput(response.content, input.generationType)
      return { ok: true, output, mode }
    } catch (err) {
      return { ok: false, error: normalizeError(err) }
    }
  }
}

// ─── Error normalizer ─────────────────────────────────────────────────────────

function normalizeError(err: unknown): AICreationError {
  if (err instanceof Error) {
    const name = err.name
    if (name === 'AbortError' || name === 'TimeoutError') {
      return { code: 'TIMEOUT', message: `Request timed out after ${TIMEOUT_MS / 1000}s.` }
    }
    const msg = err.message
    if (msg.includes('rate') || msg.includes('429')) {
      return { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' }
    }
    if (msg.includes('quota') || msg.includes('insufficient') || msg.includes('credit')) {
      return { code: 'CREDIT_EXHAUSTED', message: 'Credits or quota exhausted for the selected funding source.' }
    }
    if (msg.includes('JSON') || msg.includes('parse') || msg.includes('missing title')) {
      return { code: 'PARSE_ERROR', message: 'The AI returned an unexpected format. Please try again.' }
    }
    return { code: 'PROVIDER_ERROR', message: msg.slice(0, 300) }
  }
  return { code: 'PROVIDER_ERROR', message: 'An unexpected error occurred. Please try again.' }
}
