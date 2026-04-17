// NodeRuntime — single-node lifecycle (retry / timeout / moderation /
// contract) extracted from `WorkflowExecutionService` in Phase 3.
//
// Scope (Information Expert for per-node state):
//   * Resolve template + contracts.
//   * Render prompt (delegates to PromptResolver for placeholder strictness).
//   * Validate input contract + input moderation.
//   * Call provider with retry / timeout / streaming partials.
//   * Validate output moderation + output contract.
//   * Return an immutable `NodeRuntimeOutcome`.
//
// It does not own the wave queue (that is `Scheduler`) or the event bus
// (that is `EventPublisher`). It exposes per-event hooks the controller uses
// to publish envelopes.

import { validateInputs, validateOutput } from './contract-validator'
import { renderPrompt, resolveRenderedInputs, type ResolverEdge, type ResolverNode, type ResolverUpstreamResult } from './prompt-resolver'
import { PlaceholderUnboundError } from './validator'

import type {
  ExecutionInput,
  ExecutionResult,
  IExecutionProvider,
  IStreamingExecutionProvider,
  ModerationDecision,
  ModerationGateway,
  ModerationPhase,
  PartialOutputSink,
} from './execution.types'
import type {
  LensInputContract,
  LensOutputContract,
  NodeOutputEnvelope,
} from '@lenserfight/types'

// ── Public types ──────────────────────────────────────────────────────────

export type NodeRuntimeStatus =
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'blocked'
  | 'invalidated'

export interface NodeRuntimeOutcome {
  status: NodeRuntimeStatus
  envelope?: NodeOutputEnvelope
  outputData?: Record<string, unknown>
  error?: string
  errorCode?: string
  attempts: number
  /** Retries consumed = max(0, attempts - 1). Denormalised for convenience. */
  retries: number
  /** Wall-clock of the final provider attempt, in ms. Null when the node never called the provider. */
  durationMs: number | null
  /** Time-to-first-byte on streamed nodes, in ms. Null for non-streaming lenses. */
  ttfbMs: number | null
}

export type RetryCause = 'timeout' | 'provider_error' | 'rate_limit' | 'contract_violated'

export interface RetryPolicy {
  attempts: number
  backoffMs: number
  maxBackoffMs: number
  retryOn: RetryCause[]
}

export interface NodeRuntimeConfig {
  retry: RetryPolicy
  timeoutMs: number
  moderation: 'off' | 'input' | 'output' | 'both'
}

export interface NodeRuntimeInput {
  nodeId: string
  lensId: string
  versionId?: string | null
  template: string
  inputContract: LensInputContract | null
  outputContract: LensOutputContract | null
  rootInputs: Record<string, unknown>
  resolverNode: ResolverNode
  edges: ResolverEdge[]
  upstream: Map<string, ResolverUpstreamResult>
  signal?: AbortSignal
  moderation?: ModerationGateway
  onPartialOutput?: PartialOutputSink
  /** Called for each interesting lifecycle transition inside this node. */
  onEvent?: (name: string, metadata?: Record<string, unknown>) => void | Promise<void>
  /**
   * Opaque heartbeat sink invoked on progress boundaries (wave start, each
   * retry, every partial chunk). Defaults to no-op. Implementations should be
   * cheap (fire-and-forget) — NodeRuntime never awaits the resulting promise
   * on the hot path.
   */
  onHeartbeat?: () => void
}

// ── Runtime ───────────────────────────────────────────────────────────────

export class NodeRuntime {
  constructor(
    private readonly provider: IExecutionProvider,
    private readonly config: NodeRuntimeConfig,
  ) {}

  async execute(input: NodeRuntimeInput): Promise<NodeRuntimeOutcome> {
    const emit = async (name: string, metadata?: Record<string, unknown>) => {
      try {
        await input.onEvent?.(name, metadata)
      } catch {
        // observability failures never break execution
      }
    }

    const renderedInputs = resolveRenderedInputs(
      input.resolverNode,
      input.edges,
      input.upstream,
      input.rootInputs,
    )

    // ── Render + placeholder strictness ─────────────────────────────
    let resolvedPrompt: string
    try {
      resolvedPrompt = renderPrompt(input.template, renderedInputs, input.inputContract)
    } catch (err) {
      if (err instanceof PlaceholderUnboundError) {
        await emit('node_blocked', { errorCode: 'placeholder_unbound', label: err.label })
        return {
          status: 'blocked',
          error: 'placeholder_unbound',
          errorCode: 'placeholder_unbound',
          outputData: { placeholder: err.label },
          attempts: 0,
          retries: 0,
          durationMs: null,
          ttfbMs: null,
        }
      }
      throw err
    }

    // ── Input contract ──────────────────────────────────────────────
    const inputCheck = validateInputs(renderedInputs, input.inputContract)
    if (!inputCheck.ok) {
      await emit('contract_violated', { phase: 'input', errors: inputCheck.errors })
      return {
        status: 'failed',
        error: 'input_contract_violation',
        errorCode: 'input_contract_violation',
        outputData: { contractErrors: inputCheck.errors },
        attempts: 0,
        retries: 0,
        durationMs: null,
        ttfbMs: null,
      }
    }

    // ── Input moderation ────────────────────────────────────────────
    if (input.moderation && (this.config.moderation === 'input' || this.config.moderation === 'both')) {
      const decision = await safeCheck(input.moderation, 'input', resolvedPrompt, input.nodeId)
      if (!decision.allowed) {
        await emit('moderation_flagged', { phase: 'input', decision })
        return {
          status: 'failed',
          error: 'moderation_blocked',
          errorCode: 'moderation_blocked',
          outputData: { moderation: decision },
          attempts: 0,
          retries: 0,
          durationMs: null,
          ttfbMs: null,
        }
      }
    }

    // ── Provider call with retry + timeout ──────────────────────────
    let envelope: NodeOutputEnvelope | null = null
    let providerError: { cause: RetryCause; err: unknown } | null = null
    let attempt = 0
    let durationMs: number | null = null
    let ttfbMs: number | null = null

    const isAborted = () => input.signal?.aborted ?? false
    const heartbeat = () => {
      try {
        input.onHeartbeat?.()
      } catch {
        // heartbeat failures never break execution
      }
    }

    while (attempt < this.config.retry.attempts) {
      attempt++
      if (isAborted()) break

      const attemptStart = nowMs()
      let firstByteAt: number | null = null
      heartbeat()

      try {
        const execResult = await runWithTimeout(
          this.provider,
          input.lensId,
          { prompt: resolvedPrompt },
          this.config.timeoutMs,
          input.signal,
          input.onPartialOutput || input.onHeartbeat
            ? (partial) => {
                if (firstByteAt === null) firstByteAt = nowMs()
                heartbeat()
                return input.onPartialOutput?.(input.nodeId, partial)
              }
            : undefined,
        )
        envelope = toEnvelope(execResult, input.outputContract)
        durationMs = Math.max(0, Math.round(nowMs() - attemptStart))
        if (firstByteAt !== null) {
          ttfbMs = Math.max(0, Math.round(firstByteAt - attemptStart))
        }
        providerError = null
        break
      } catch (err) {
        durationMs = Math.max(0, Math.round(nowMs() - attemptStart))
        if (firstByteAt !== null && ttfbMs === null) {
          ttfbMs = Math.max(0, Math.round(firstByteAt - attemptStart))
        }

        if (isAbortError(err) || isAborted()) {
          providerError = { cause: 'provider_error', err }
          break
        }
        const cause: RetryCause = isTimeoutError(err)
          ? 'timeout'
          : isRateLimitError(err)
            ? 'rate_limit'
            : 'provider_error'
        providerError = { cause, err }

        const shouldRetry = attempt < this.config.retry.attempts && this.config.retry.retryOn.includes(cause)
        if (!shouldRetry) break

        const delay = computeBackoff(this.config.retry.backoffMs, this.config.retry.maxBackoffMs, attempt)
        await emit('node_retried', { attempt, cause, delayMs: delay })
        heartbeat()
        await sleep(delay, input.signal)
      }
    }

    const retries = Math.max(0, attempt - 1)

    if (isAbortError(providerError?.err) || isAborted()) {
      return { status: 'cancelled', attempts: attempt, retries, durationMs, ttfbMs }
    }

    if (providerError) {
      const cause = providerError.cause
      const status: NodeRuntimeStatus = cause === 'timeout' ? 'timed_out' : 'failed'
      await emit(cause === 'timeout' ? 'timed_out' : 'node_failed', {
        errorCode: cause,
        attempts: attempt,
        durationMs,
      })
      return {
        status,
        error: errorMessage(providerError.err),
        errorCode: cause,
        attempts: attempt,
        retries,
        durationMs,
        ttfbMs,
      }
    }

    // ── Output moderation ───────────────────────────────────────────
    if (
      envelope &&
      input.moderation &&
      (this.config.moderation === 'output' || this.config.moderation === 'both')
    ) {
      const decision = await safeCheck(input.moderation, 'output', envelope.output, input.nodeId)
      if (!decision.allowed) {
        await emit('moderation_flagged', { phase: 'output', decision })
        return {
          status: 'failed',
          error: 'moderation_blocked',
          errorCode: 'moderation_blocked',
          outputData: { moderation: decision },
          attempts: attempt,
          retries,
          durationMs,
          ttfbMs,
        }
      }
    }

    // ── Output contract ─────────────────────────────────────────────
    const outputCheck = validateOutput(envelope, input.outputContract)
    if (!outputCheck.ok) {
      await emit('contract_violated', { phase: 'output', errors: outputCheck.errors })
      return {
        status: 'invalidated',
        error: 'output_contract_violation',
        errorCode: 'output_contract_violation',
        outputData: { contractErrors: outputCheck.errors, envelope },
        attempts: attempt,
        retries,
        durationMs,
        ttfbMs,
      }
    }

    // ── Success ─────────────────────────────────────────────────────
    return {
      status: 'completed',
      envelope: envelope!,
      outputData: envelopeToOutputData(envelope!),
      attempts: attempt,
      retries,
      durationMs,
      ttfbMs,
    }
  }
}

function nowMs(): number {
  // Use performance.now() when available for sub-ms precision; fall back to
  // Date.now() on runtimes that don't expose it (older Workers, test envs).
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

// ── Helpers (shared surface; imported by controller) ─────────────────────

export function computeBackoff(baseMs: number, maxMs: number, attempt: number): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)))
  const jitter = 0.5 + Math.random() * 0.5
  return Math.round(exp * jitter)
}

export function envelopeToOutputData(envelope: NodeOutputEnvelope): Record<string, unknown> {
  return {
    mediaType:
      envelope.artifactKind === 'image'
        ? 'image'
        : envelope.artifactKind === 'video'
          ? 'video'
          : envelope.artifactKind === 'audio'
            ? 'audio'
            : 'text',
    output: envelope.output,
    text: envelope.output,
    ...(envelope.media?.url ? { url: envelope.media.url } : {}),
    ...(envelope.media?.mime ? { mimeType: envelope.media.mime } : {}),
    ...(envelope.data ? { data: envelope.data } : {}),
    ...(envelope.metadata ?? {}),
    kind: envelope.kind,
    artifactKind: envelope.artifactKind,
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof DOMException) return err.name === 'AbortError'
  if (typeof err === 'object' && err !== null && 'name' in err) {
    return (err as { name?: string }).name === 'AbortError'
  }
  return false
}

function isTimeoutError(err: unknown): boolean {
  if (!err) return false
  const msg = errorMessage(err).toLowerCase()
  return msg.includes('timeout') || msg.includes('timed out')
}

function isRateLimitError(err: unknown): boolean {
  if (!err) return false
  const msg = errorMessage(err).toLowerCase()
  if (msg.includes('rate limit') || msg.includes('429')) return true
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status?: number }).status
    return status === 429
  }
  return false
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(), ms)
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer)
        reject(new DOMException('aborted', 'AbortError'))
        return
      }
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new DOMException('aborted', 'AbortError'))
        },
        { once: true },
      )
    }
  })
}

async function runWithTimeout(
  provider: IExecutionProvider,
  modelId: string,
  input: ExecutionInput,
  timeoutMs: number,
  parentSignal: AbortSignal | undefined,
  onPartial: ((partial: { text: string }) => void | Promise<void>) | undefined,
): Promise<ExecutionResult> {
  const streaming = provider as IStreamingExecutionProvider
  if (onPartial && typeof streaming.stream === 'function') {
    const controller = createLinkedController(parentSignal)
    const timeoutId = setTimeout(() => controller.abort(new DOMException('timeout', 'AbortError')), timeoutMs)
    try {
      let aggregated = ''
      let media: { url: string; mime?: string } | null = null
      let finalEnvelope: NodeOutputEnvelope | null = null
      for await (const chunk of streaming.stream(modelId, input, controller.signal)) {
        if (chunk.type === 'partial') {
          aggregated += chunk.text
          await onPartial({ text: aggregated })
        } else if (chunk.type === 'media') {
          media = { url: chunk.url, mime: chunk.mime }
        } else if (chunk.type === 'final') {
          finalEnvelope = chunk.envelope
        }
      }
      if (finalEnvelope) {
        return envelopeToExecutionResult(finalEnvelope)
      }
      return {
        mediaType: media ? guessMediaType(media.mime) : 'text',
        text: aggregated || undefined,
        url: media?.url,
        mimeType: media?.mime,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const controller = createLinkedController(parentSignal)
  const timeoutId = setTimeout(() => controller.abort(new DOMException('timeout', 'AbortError')), timeoutMs)
  try {
    return await provider.execute(modelId, input, controller.signal)
  } finally {
    clearTimeout(timeoutId)
  }
}

function createLinkedController(parentSignal?: AbortSignal): AbortController {
  const controller = new AbortController()
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason)
    } else {
      parentSignal.addEventListener(
        'abort',
        () => controller.abort(parentSignal.reason),
        { once: true },
      )
    }
  }
  return controller
}

function guessMediaType(mime?: string): 'text' | 'image' | 'video' | 'audio' {
  if (!mime) return 'text'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'text'
}

function toEnvelope(
  execResult: ExecutionResult,
  outputContract: LensOutputContract | null,
): NodeOutputEnvelope {
  const kind = outputContract?.kind ?? (execResult.mediaType === 'image'
    ? 'image'
    : execResult.mediaType === 'video'
      ? 'video'
      : 'text')
  const artifactKind = outputContract?.artifactKind ?? (execResult.mediaType === 'audio' ? 'audio' : execResult.mediaType)

  const output = execResult.text ?? execResult.url ?? ''
  const media = execResult.url
    ? {
        url: execResult.url,
        mime: execResult.mimeType ?? null,
        width: null,
        height: null,
        durationS: null,
        bytes: null,
      }
    : null
  return {
    kind: kind as NodeOutputEnvelope['kind'],
    artifactKind: artifactKind as NodeOutputEnvelope['artifactKind'],
    output,
    media,
    metadata: {
      ...(execResult.metadata ?? {}),
      durationMs: execResult.durationMs,
      mimeType: execResult.mimeType,
    },
  }
}

function envelopeToExecutionResult(envelope: NodeOutputEnvelope): ExecutionResult {
  return {
    mediaType:
      envelope.artifactKind === 'image'
        ? 'image'
        : envelope.artifactKind === 'video'
          ? 'video'
          : envelope.artifactKind === 'audio'
            ? 'audio'
            : 'text',
    text: envelope.output ?? undefined,
    url: envelope.media?.url ?? undefined,
    mimeType: envelope.media?.mime ?? undefined,
    metadata: envelope.metadata,
  }
}

async function safeCheck(
  gateway: ModerationGateway,
  phase: ModerationPhase,
  text: string,
  nodeId: string,
): Promise<ModerationDecision> {
  try {
    return await gateway.check(phase, text, nodeId)
  } catch (err) {
    return { allowed: true, policy: 'error', reason: `moderation_check_failed: ${errorMessage(err)}` }
  }
}
