/**
 * Cloud BYOK funding adapter.
 *
 * The user's API key lives encrypted in Supabase Vault. fn_get_my_key_secret
 * decrypts it server-side (ownership-checked) and the browser streams directly
 * to the provider. Works in both local and cloud Supabase environments.
 *
 *  - Text   → walletApiClient.resolveCloudByokKey → streamLocalProvider
 *  - Media  → executionService.triggerExecution (async — caller polls)
 */
import { executionService, walletApiClient } from '@lenserfight/data/repositories'

import { streamLocalProvider } from '../utils/localProviderStream'

import {
  FundingAdapterError,
  type FundingAdapter,
  type MediaExecutionRequest,
  type MediaExecutionResult,
  type TextStreamRequest,
} from './types'

import type { ProviderMessage } from '@lenserfight/providers'
import type { StreamCallbacks } from '@lenserfight/types'

export interface CloudByokAdapterCtx {
  /** Cloud key reference id (from the user's vault). */
  keyRefId: string | null
  /** Origin type forwarded to trigger-execution (defaults to 'lens_preview'). */
  originType?: string
}

export function createCloudByokAdapter(ctx: CloudByokAdapterCtx): FundingAdapter {
  function requireKey(): string {
    if (!ctx.keyRefId) {
      throw new FundingAdapterError(
        'Cloud BYOK requires a selected API key. Add one in Settings → API keys.',
        'user_byok_cloud',
        'misconfigured'
      )
    }
    return ctx.keyRefId
  }

  return {
    source: 'user_byok_cloud',

    async streamText(
      req: TextStreamRequest,
      signal: AbortSignal,
      callbacks: StreamCallbacks
    ): Promise<void> {
      const keyRefId = requireKey()

      // Decrypt the cloud vault key server-side and stream directly to the provider.
      // fn_get_my_key_secret enforces ownership (lenser_id = caller) and works in
      // both local and cloud Supabase environments.
      const decryptedKey = await walletApiClient.resolveCloudByokKey(keyRefId)
      await streamLocalProvider({
        provider: req.provider,
        model: req.model,
        messages: req.messages as unknown as ProviderMessage[],
        decryptedKey,
        signal,
        callbacks,
      })
    },

    async executeMedia(req: MediaExecutionRequest): Promise<MediaExecutionResult> {
      const keyRefId = requireKey()
      const resp = await executionService.triggerExecution({
        lens_id: req.lensId,
        version_id: req.versionId,
        model_id: req.model,
        input_snapshot: { ...req.inputSnapshot, prompt: req.prompt },
        attachment_bindings: req.attachmentBindings,
        funding_source: 'user_byok_cloud',
        origin_type: (ctx.originType ?? 'lens_preview') as 'lens_preview',
        byok_key_ref_id: keyRefId,
        generative_media_params: {
          output_modality: req.modality,
          ...req.generativeMediaParams,
        },
      })
      return { runId: resp.execution_run_id, isAsync: true }
    },
  }
}
