/**
 * Chainabit funding adapter.
 *
 * The user pays via their Chainabit credit balance. The browser never holds a
 * provider key — Chainabit (or our edge function on Chainabit's behalf) does.
 *
 *  - Text   → walletApiClient.streamWithWallet (proxied stream)
 *  - Media  → executionService.triggerExecution with funding=platform_credit
 */
import { executionService, walletApiClient } from '@lenserfight/data/repositories'

import {
  type FundingAdapter,
  type MediaExecutionRequest,
  type MediaExecutionResult,
  type TextStreamRequest,
} from './types'

import type { StreamCallbacks } from '@lenserfight/types'

export interface ChainabitAdapterCtx {
  originType?: string
}

export function createChainabitAdapter(ctx: ChainabitAdapterCtx = {}): FundingAdapter {
  return {
    source: 'platform_credit',

    async streamText(req: TextStreamRequest, signal: AbortSignal, callbacks: StreamCallbacks): Promise<void> {
      await walletApiClient.streamWithWallet(
        {
          provider: req.provider,
          model: req.model,
          messages: req.messages,
        },
        signal,
        callbacks,
      )
    },

    async executeMedia(req: MediaExecutionRequest): Promise<MediaExecutionResult> {
      const resp = await executionService.triggerExecution({
        lens_id: req.lensId,
        model_id: req.model,
        input_snapshot: { ...req.inputSnapshot, prompt: req.prompt },
        funding_source: 'platform_credit',
        origin_type: (ctx.originType ?? 'lens_preview') as 'lens_preview',
        generative_media_params: {
          output_modality: req.modality,
          ...req.generativeMediaParams,
        },
      })
      return { runId: resp.execution_run_id, isAsync: true }
    },
  }
}
