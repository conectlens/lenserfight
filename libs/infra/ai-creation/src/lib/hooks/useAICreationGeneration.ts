import { supabase, getCachedAccessToken } from '@lenserfight/data/supabase'
import { useState, useCallback } from 'react'
import { ProfileAIPreferenceResolver } from '../profile-ai-preference.resolver'
import { AICreationService } from '../ai-creation.service'
import { readEnv } from '@lenserfight/utils/env'
import type {
  AICreationError,
  AICreationInput,
  AICreationOutput,
  GenerationType,
  LensCreationContext,
  WorkflowCreationContext,
  GenerateCreationRequest,
  GenerateCreationResponse,
  GenerateCreationErrorResponse,
} from '../creation.types'

// ─── Edge Function URL ────────────────────────────────────────────────────────

const SUPABASE_URL = readEnv('SUPABASE_URL', 'http://localhost:54321')
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseAICreationGenerationOptions {
  /** auth.uid() of the active lenser — required. */
  profileId: string
  generationType: GenerationType
  context: LensCreationContext | WorkflowCreationContext
  /**
   * Injected from `useFundingSource().resolveLocalKey` (or `useLocalKeyStore().resolveKey`).
   * Required only when the profile's funding source is `user_byok_local`.
   * Injecting avoids a circular dependency between this lib and features/lenses.
   */
  resolveLocalKey?: (keyId: string) => Promise<string>
}

// ─── Return value ─────────────────────────────────────────────────────────────

export interface UseAICreationGenerationResult {
  /** Call with the user's prompt (or null/empty for recommendation mode). */
  generate: (prompt: string | null) => Promise<AICreationOutput | null>
  isGenerating: boolean
  /** Last error from a failed generation. Cleared on next generate() call. */
  error: AICreationError | null
  /** Reset error state without re-generating. */
  resetError: () => void
  /** Which mode was used in the last successful generation. */
  lastMode: 'prompted' | 'recommendation' | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const resolver = new ProfileAIPreferenceResolver(supabase)

/**
 * Centralizes AI generation calls for lens and workflow creation.
 *
 * Routing logic:
 *  - `user_byok_local`  → resolved client-side via injected `resolveLocalKey`, then
 *                         calls `callProvider()` directly via {@link AICreationService}
 *  - `platform_credit`  → POST to `generate-creation` edge function (server resolves Chainabit token)
 *  - `user_byok_cloud`  → POST to `generate-creation` edge function (server decrypts vault key)
 *
 * Generation modes:
 *  - `prompted`         → prompt is a non-empty string; AI follows it
 *  - `recommendation`   → prompt is null/empty; AI suggests based on context
 */
export function useAICreationGeneration(options: UseAICreationGenerationOptions): UseAICreationGenerationResult {
  const { profileId, generationType, context, resolveLocalKey } = options

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<AICreationError | null>(null)
  const [lastMode, setLastMode] = useState<'prompted' | 'recommendation' | null>(null)

  const generate = useCallback(
    async (prompt: string | null): Promise<AICreationOutput | null> => {
      if (!profileId) {
        setError({ code: 'UNAUTHORIZED', message: 'No active profile.' })
        return null
      }

      setError(null)
      setIsGenerating(true)

      try {
        // 1. Validate prompt length early (mirrors server-side check)
        if (prompt && prompt.length > AICreationService.MAX_PROMPT_LENGTH) {
          const err: AICreationError = {
            code: 'PROMPT_TOO_LONG',
            message: `Prompt must not exceed ${AICreationService.MAX_PROMPT_LENGTH} characters.`,
            maxLength: AICreationService.MAX_PROMPT_LENGTH,
          }
          setError(err)
          return null
        }

        // 2. Resolve profile AI preference
        const preference = await resolver.resolve(profileId)
        const mode: 'prompted' | 'recommendation' = prompt?.trim() ? 'prompted' : 'recommendation'

        const input: AICreationInput = { generationType, prompt, profileId, context }

        // 3. Route by funding source
        if (preference.fundingSource === 'user_byok_local') {
          // Client-side path — key resolved via injected resolver (gateway loopback)
          if (!resolveLocalKey) {
            setError({
              code: 'GATEWAY_ERROR',
              message: 'Local BYOK key resolver not available. Please re-open this modal.',
            })
            return null
          }
          const service = new AICreationService(resolveLocalKey)
          const result = await service.generate(input, preference)
          if (!result.ok) {
            setError(result.error)
            return null
          }
          setLastMode(result.mode)
          return result.output
        }

        // 4. Server path (platform_credit or user_byok_cloud)
        const token =
          getCachedAccessToken() ?? (await supabase.auth.getSession()).data.session?.access_token
        if (!token) {
          setError({ code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.' })
          return null
        }

        const body: GenerateCreationRequest = {
          generation_type: generationType,
          prompt: prompt?.trim() || null,
          profile_id: profileId,
          context,
          funding_source: preference.fundingSource as 'platform_credit' | 'user_byok_cloud',
          key_ref_id: preference.selectedKeyRefId ?? null,
          provider_key: preference.providerId,
          model_key: preference.modelId,
        }

        const signal = AbortSignal.timeout(AICreationService.TIMEOUT_MS + 5_000)
        const response = await fetch(`${EDGE_BASE}/generate-creation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal,
        })

        let parsed: GenerateCreationResponse | GenerateCreationErrorResponse
        try {
          parsed = await response.json()
        } catch {
          setError({ code: 'PROVIDER_ERROR', message: `Server returned status ${response.status}.` })
          return null
        }

        if (!parsed.ok) {
          setError((parsed as GenerateCreationErrorResponse).error)
          return null
        }

        const success = parsed as GenerateCreationResponse
        setLastMode(success.mode)
        return success.output
      } catch (err) {
        const name = (err as Error)?.name
        if (name === 'AbortError' || name === 'TimeoutError') {
          setError({
            code: 'TIMEOUT',
            message: `Request timed out after ${AICreationService.TIMEOUT_MS / 1000}s. Please try again.`,
          })
        } else {
          setError({
            code: 'PROVIDER_ERROR',
            message: err instanceof Error ? err.message.slice(0, 300) : 'An unexpected error occurred.',
          })
        }
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [profileId, generationType, context, resolveLocalKey],
  )

  const resetError = useCallback(() => setError(null), [])

  return { generate, isGenerating, error, resetError, lastMode }
}
