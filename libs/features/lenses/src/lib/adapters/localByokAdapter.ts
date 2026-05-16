/**
 * Local BYOK funding adapter.
 *
 * The plaintext key is fetched from the LenserFight Gateway loopback daemon
 * just-in-time, then sent directly to the upstream AI provider from the
 * browser (text streaming via SSE / NDJSON; media via direct fetch).
 * LenserFight servers never see the plaintext — and neither does the browser
 * cache, beyond the lifetime of a single `resolveLocalKey()` call.
 *
 * The adapter is transport-agnostic: callers supply a `resolveLocalKey(id)`
 * function (typically `useLocalKeyStore().resolveKey`). Whether that function
 * talks to the gateway, the filesystem, or some future runner is the
 * adapter's caller's concern.
 */
import { callGenerativeMedia } from '@lenserfight/providers'


import { streamLocalProvider } from '../utils/localProviderStream'

import {
  FundingAdapterError,
  type FundingAdapter,
  type MediaExecutionRequest,
  type MediaExecutionResult,
  type TextStreamRequest,
} from './types'

import type { GenerativeMediaProvider, ProviderMessage } from '@lenserfight/providers'
import type { StreamCallbacks } from '@lenserfight/types'

export interface LocalByokAdapterCtx {
  /** Returns the decrypted plaintext key for a given local key id. */
  resolveLocalKey(id: string): Promise<string>
  /** Identifier of the currently selected local key. */
  localKeyId: string | null
}

function randomRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // fall through
    }
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, '0'))
  return `local-${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

export function createLocalByokAdapter(ctx: LocalByokAdapterCtx): FundingAdapter {
  function requireKey(): Promise<string> {
    if (!ctx.localKeyId) {
      return Promise.reject(
        new FundingAdapterError(
          'No local key selected — add one in the funding panel before running this model.',
          'user_byok_local',
          'misconfigured',
        ),
      )
    }
    return ctx.resolveLocalKey(ctx.localKeyId)
  }

  return {
    source: 'user_byok_local',

    async streamText(req: TextStreamRequest, signal: AbortSignal, callbacks: StreamCallbacks): Promise<void> {
      const decryptedKey = await requireKey()
      await streamLocalProvider({
        provider: req.provider,
        model: req.model,
        // Message.content is a string in the shared wallet types; ProviderMessage
        // is a superset that also accepts ContentPart[] — the upcast is safe.
        messages: req.messages as ProviderMessage[],
        decryptedKey,
        signal,
        callbacks,
      })
    },

    async executeMedia(req: MediaExecutionRequest, signal: AbortSignal): Promise<MediaExecutionResult> {
      const decryptedKey = await requireKey()

      // Bail early on providers we know don't have a media adapter, so the
      // failure message is actionable rather than a generic 4xx from the
      // provider.
      try {
        const response = await callGenerativeMedia(
          req.provider as GenerativeMediaProvider,
          req.modality,
          decryptedKey,
          req.model,
          req.prompt,
          {
            ...req.generativeMediaParams,
            ...req.inputSnapshot,
            signal,
          },
        )

        if (response.status === 'pending') {
          // Async providers (video, long audio). For the local path we don't
          // yet have a generic in-browser poll loop — surface a clear error so
          // the user can pick a different funding source for now.
          throw new FundingAdapterError(
            `${req.modality} generation on ${req.provider} is async — local polling isn't supported yet. Try a synchronous image model with Local Keys, or switch funding to LF Cloud Keys / Chainabit.`,
            'user_byok_local',
            'unsupported',
          )
        }

        if (response.status === 'failed') {
          throw new FundingAdapterError(response.message, 'user_byok_local', 'transport')
        }

        return {
          runId: randomRunId(),
          isAsync: false,
          mediaUrls: response.urls,
          mimeType: response.mimeType,
          width: response.width,
          height: response.height,
          durationSeconds: response.durationSeconds,
        }
      } catch (err) {
        if (err instanceof FundingAdapterError) throw err
        const message =
          err instanceof Error
            ? err.message
            : `Local ${req.modality} generation failed against ${req.provider}.`
        throw new FundingAdapterError(message, 'user_byok_local', 'transport')
      }
    },
  }
}
