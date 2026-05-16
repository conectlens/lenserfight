/**
 * Funding adapter contracts.
 *
 * Each funding source — Chainabit, LF Cloud BYOK, Local BYOK — runs against the
 * same {@link FundingAdapter} interface. The component layer does NOT know about
 * the differences in transport (browser-direct vs edge function vs Chainabit
 * partner API): it picks an adapter via {@link selectFundingAdapter} and asks
 * for text streaming or media generation.
 *
 * GRASP — *Polymorphism*: callers depend on this abstraction, not concrete
 * transports. This keeps `useLabController` and friends free of `if (funding ===
 * 'user_byok_local') ... else if (...)` ladders.
 */
import type {
  FundingSource,
  GenerativeMediaParams,
  Message,
  StreamCallbacks,
} from '@lenserfight/types'

/** Provider keys we currently dispatch streaming text against. */
export type TextProviderKey = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama'

export type MediaModality = 'image' | 'video' | 'audio' | 'music'

export interface TextStreamRequest {
  lensId: string
  provider: TextProviderKey
  model: string
  messages: Message[]
}

export interface MediaExecutionRequest {
  lensId: string
  provider: string
  model: string
  modality: MediaModality
  prompt: string
  inputSnapshot: Record<string, unknown>
  generativeMediaParams?: GenerativeMediaParams
  /**
   * Optional cloud key reference (only honored by the cloud adapter — included
   * here so the request shape is shared across adapters).
   */
  byokKeyRefId?: string
}

/**
 * A media result returned by an adapter.
 *
 * - When `isAsync` is `true`, only `runId` is populated; callers must poll the
 *   server for completion (CloudByokAdapter, ChainabitAdapter).
 * - When `isAsync` is `false`, `mediaUrls` and `mimeType` are populated and the
 *   result is renderable immediately (LocalByokAdapter — direct provider call).
 */
export interface MediaExecutionResult {
  runId: string
  isAsync: boolean
  mediaUrls?: string[]
  mimeType?: string
  width?: number
  height?: number
  durationSeconds?: number
}

export interface FundingAdapter {
  readonly source: FundingSource
  streamText(req: TextStreamRequest, signal: AbortSignal, callbacks: StreamCallbacks): Promise<void>
  executeMedia(req: MediaExecutionRequest, signal: AbortSignal): Promise<MediaExecutionResult>
}

export class FundingAdapterError extends Error {
  constructor(
    message: string,
    public readonly source: FundingSource,
    public readonly kind: 'misconfigured' | 'unsupported' | 'transport',
  ) {
    super(message)
    this.name = 'FundingAdapterError'
  }
}
