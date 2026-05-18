/**
 * Cloud BYOK funding adapter.
 *
 * The user's API key lives encrypted in Supabase; the edge function resolves it
 * via Vault and proxies the request to the provider. The browser never holds
 * the plaintext key.
 *
 *  - Text   → walletApiClient.streamWithByok (SSE proxy)
 *  - Media  → executionService.triggerExecution (async — caller polls)
 *
 * In dev (`import.meta.env.DEV`), text streaming also has a local-resolver
 * fallback to skip the edge function; that branch is tree-shaken in prod.
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
        'misconfigured',
      )
    }
    return ctx.keyRefId
  }

  return {
    source: 'user_byok_cloud',

    async streamText(req: TextStreamRequest, signal: AbortSignal, callbacks: StreamCallbacks): Promise<void> {
      const keyRefId = requireKey()

      if (import.meta.env.DEV) {
        // Local dev convenience: decrypt server-side and stream directly to the
        // provider from the browser. Tree-shaken in production builds.
        const decryptedKey = await walletApiClient.resolveByokKeyForLocalDev(keyRefId)
        await streamLocalProvider({
          provider: req.provider,
          model: req.model,
          messages: req.messages as unknown as ProviderMessage[],
          decryptedKey,
          signal,
          callbacks,
        })
        return
      }

      await walletApiClient.streamWithByok(
        {
          key_ref_id: keyRefId,
          provider: req.provider,
          model: req.model,
          messages: req.messages,
        },
        signal,
        callbacks,
      )
    },

    async executeMedia(req: MediaExecutionRequest): Promise<MediaExecutionResult> {
      const keyRefId = requireKey()
      const resp = await executionService.triggerExecution({
        lens_id: req.lensId,
        model_id: req.model,
        // The edge function resolves the prompt from input_snapshot.prompt as
        // the first fallback after generative_media_params.prompt, so injecting
        // it here keeps the contract simple and forward-compatible.
        input_snapshot: { ...req.inputSnapshot, prompt: req.prompt },
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
