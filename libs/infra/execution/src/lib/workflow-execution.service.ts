import { validateInputs, validateOutput } from './contract-validator'
import { detectCycle as validatorDetectCycle, PlaceholderUnboundError } from './validator'

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

export type NodeStatus =
  | 'pending'
  | 'awaiting_dependency'
  | 'queued'
  | 'running'
  | 'streaming'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'blocked'
  | 'invalidated'

export type MergeStrategy = 'last_write_wins' | 'concat' | 'array' | 'json_object'

export type OnParentFailurePolicy = 'skip' | 'propagate' | 'substitute_default'

export type RetryCause = 'timeout' | 'provider_error' | 'rate_limit' | 'contract_violated'

export interface RetryConfig {
  attempts: number
  backoffMs?: number
  maxBackoffMs?: number
  retryOn?: RetryCause[]
}

export interface ModerationConfig {
  policy?: 'off' | 'input' | 'output' | 'both'
}

export interface WorkflowNodeConfig {
  retry?: RetryConfig
  timeoutMs?: number
  onParentFailure?: OnParentFailurePolicy
  merge?: MergeStrategy
  moderation?: ModerationConfig['policy']
}

export interface WorkflowNode {
  id: string
  lensId: string
  versionId?: string | null
  /** [[label]] param names present in the lens template — resolved from incoming edges */
  paramLabels?: string[]
  /** Per-node execution policy. Optional; engine uses safe defaults when absent. */
  config?: WorkflowNodeConfig
}

export interface WorkflowEdge {
  sourceNodeId: string
  targetNodeId: string
  sourceOutputKey: string
  targetParamLabel: string
  /** Optional per-edge merge strategy override. Falls back to target node's config.merge. */
  mergeStrategy?: MergeStrategy | null
  /** Optional condition — when evaluates false, the edge is skipped. */
  condition?: EdgeCondition | null
}

export interface EdgeCondition {
  type: 'equals' | 'contains' | 'present' | 'truthy'
  /** Value compared against the source output[sourceOutputKey] (or the whole envelope if type='present'). */
  value?: unknown
}

export interface NodeResult {
  nodeId: string
  status: NodeStatus
  outputData?: Record<string, unknown>
  envelope?: NodeOutputEnvelope
  error?: string
  attempts?: number
  /**
   * Populated when `status` is `awaiting_dependency` | `queued` | `retrying`.
   * Mirrors `WaitingReason` so the run-state projection knows why the node is
   * not currently executing.
   */
  waitingReason?: WaitingReason | null
}

export interface WorkflowRunResult {
  runId: string
  status: 'completed' | 'failed' | 'cancelled'
  nodeResults: NodeResult[]
}

export type EngineEventName =
  | 'node_queued'
  | 'node_waiting'
  | 'node_started'
  | 'node_retried'
  | 'moderation_flagged'
  | 'contract_violated'
  | 'timed_out'
  | 'node_failed'
  | 'node_completed'
  | 'node_cancelled'
  | 'node_skipped'
  | 'node_blocked'
  | 'node_invalidated'
  | 'node_stream_delta'

/**
 * Why a node is currently waiting. Mirrors the canonical taxonomy in
 * `WORKFLOW_WAITING_REASONS` so the engine, transport, and UI agree on
 * which value is being persisted into `workflow_node_results.waiting_reason`.
 */
export type WaitingReason =
  | 'dependency'
  | 'condition_false'
  | 'rate_limit'
  | 'retry_backoff'
  | 'human_input'
  | 'external_callback'
  | 'queued'

export interface EngineEvent {
  runId: string
  nodeId: string
  name: EngineEventName
  metadata?: Record<string, unknown>
}

/**
 * Field-level handoff captured by the engine each time a downstream node
 * successfully reads a parent node's output. Mirrors
 * `lenses.workflow_run_provenance` so the persistence layer can write it
 * verbatim.
 */
export interface ProvenanceHandoff {
  sourceRunId: string
  sourceNodeId: string
  sourceOutputPath: string
  targetRunId: string
  targetNodeId: string
  targetInputPath: string
  transform?: Record<string, unknown> | null
}

export interface WorkflowExecutionContext {
  runId: string
  /**
   * Optional parent run id when this run is a subflow. Used to derive
   * cross-workflow provenance edges where data crosses the run boundary.
   */
  parentRunId?: string | null
  /** Root-level inputs for nodes with no incoming edges */
  rootInputs: Record<string, unknown>
  /** Optional abort signal for cancellation-aware execution */
  signal?: AbortSignal
  /** Resolves a lens version's template body by lensId + versionId */
  resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string>
  /** Optional contract resolver — when provided, engine validates inputs/outputs per node. */
  resolveVersionContracts?(
    versionId?: string | null,
  ): Promise<{ input: LensInputContract | null; output: LensOutputContract | null }>
  /** Called when a node changes status — used by the CF Worker to write workflow_node_results */
  onNodeStatusChange(nodeId: string, result: NodeResult): Promise<void>
  /** Optional partial-output sink for streaming providers (throttled by caller). */
  onPartialOutput?: PartialOutputSink
  /** Optional moderation gateway — engine calls it per node based on config.moderation. */
  moderation?: ModerationGateway
  /** Optional observability callback for every engine event (execution_tags row). */
  onEvent?(event: EngineEvent): void | Promise<void>
  /**
   * Optional sink for field-level provenance handoffs. When provided, the
   * engine calls this once per resolved edge whose value was actually used by
   * the target node so the persistence layer can write
   * `lenses.workflow_run_provenance` rows. Errors are swallowed by the engine
   * — provenance is best-effort observability.
   */
  onProvenance?(handoff: ProvenanceHandoff): void | Promise<void>
}

// ── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_RETRY: Required<RetryConfig> = {
  attempts: 1,
  backoffMs: 500,
  maxBackoffMs: 8000,
  retryOn: ['timeout', 'provider_error', 'rate_limit'],
}

const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_ON_PARENT_FAILURE: OnParentFailurePolicy = 'skip'
const DEFAULT_MERGE: MergeStrategy = 'last_write_wins'
const DEFAULT_MODERATION: NonNullable<ModerationConfig['policy']> = 'off'

// ── Service ───────────────────────────────────────────────────────────────

/**
 * Pure workflow execution service — no Supabase calls.
 * The caller (CF Worker or browser hook) provides the context object that
 * handles all I/O.
 *
 * Algorithm (see docs/reference/workflows/execution-engine.md):
 * 1. Kahn's topological sort builds execution waves.
 * 2. Nodes in each wave are executed concurrently (Promise.all).
 * 3. Each node goes through: input merge → input contract → input moderation
 *    → provider (+ retry/timeout) → output moderation → output contract →
 *    persist envelope. Failures propagate per-node according to
 *    `config.onParentFailure`.
 */
export class WorkflowExecutionService {
  /** Exposed for tests / legacy callers; prefer the module-level helper internally. */
  static replaceTokenVariants(prompt: string, rawKey: string, value: unknown): string {
    return replaceTokenVariants(prompt, rawKey, value)
  }

  /**
   * Detects cycles in a workflow DAG using Kahn's algorithm.
   * Thin delegate over the canonical implementation in `validator.ts` so the
   * Phase 5 simulator and the builder UI share the exact same algorithm.
   */
  static detectCycle(
    nodes: { id: string }[],
    edges: { sourceNodeId: string; targetNodeId: string }[],
  ): string[] | null {
    return validatorDetectCycle(nodes, edges)
  }

  constructor(private readonly provider: IExecutionProvider) {}

  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    ctx: WorkflowExecutionContext,
  ): Promise<WorkflowRunResult> {
    const isAborted = () => ctx.signal?.aborted ?? false
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const results = new Map<string, NodeResult>()

    const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
    const dependents = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

    for (const edge of edges) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
      dependents.get(edge.sourceNodeId)?.push(edge.targetNodeId)
    }

    const markRemainingCancelled = async () => {
      const pendingNodes = nodes.filter((node) => {
        const result = results.get(node.id)
        // Mark every non-terminal status as cancelled (Phase 1 node state
        // machine). Terminal: completed, failed, cancelled, skipped,
        // timed_out, blocked, invalidated.
        return (
          !result ||
          result.status === 'pending' ||
          result.status === 'awaiting_dependency' ||
          result.status === 'queued' ||
          result.status === 'running' ||
          result.status === 'streaming' ||
          result.status === 'retrying'
        )
      })

      await Promise.all(
        pendingNodes.map(async (node) => {
          const cancelled: NodeResult = { nodeId: node.id, status: 'cancelled' }
          results.set(node.id, cancelled)
          await ctx.onNodeStatusChange(node.id, cancelled)
          await emit(ctx, { runId: ctx.runId, nodeId: node.id, name: 'node_cancelled' })
        }),
      )
    }

    // Mark every node that still has unresolved upstream edges as
    // `awaiting_dependency` up-front so the n8n-style inspector can render the
    // waiting badge instead of "pending" on initial fetch. Nodes with zero
    // incoming edges are immediately `queued` so the active vs waiting count
    // is accurate from event #0.
    await Promise.all(
      nodes.map(async (n) => {
        const degree = inDegree.get(n.id) ?? 0
        if (degree === 0) {
          const queued: NodeResult = {
            nodeId: n.id,
            status: 'queued',
            waitingReason: 'queued',
          }
          results.set(n.id, queued)
          await ctx.onNodeStatusChange(n.id, queued)
          await emit(ctx, {
            runId: ctx.runId,
            nodeId: n.id,
            name: 'node_queued',
            metadata: { waitingReason: 'queued' },
          })
        } else {
          const awaiting: NodeResult = {
            nodeId: n.id,
            status: 'awaiting_dependency',
            waitingReason: 'dependency',
          }
          results.set(n.id, awaiting)
          await ctx.onNodeStatusChange(n.id, awaiting)
          await emit(ctx, {
            runId: ctx.runId,
            nodeId: n.id,
            name: 'node_waiting',
            metadata: { waitingReason: 'dependency' },
          })
        }
      }),
    )

    let wave = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)

    while (wave.length > 0) {
      if (isAborted()) {
        await markRemainingCancelled()
        return finish(ctx.runId, results, 'cancelled')
      }

      await Promise.all(
        wave.map(async (nodeId) => {
          const node = nodeMap.get(nodeId)
          if (!node) return

          if (isAborted()) {
            const cancelled: NodeResult = { nodeId, status: 'cancelled' }
            results.set(nodeId, cancelled)
            await ctx.onNodeStatusChange(nodeId, cancelled)
            await emit(ctx, { runId: ctx.runId, nodeId, name: 'node_cancelled' })
            return
          }

          // ── Parent-failure gate ─────────────────────────────────────
          const parentStatuses = collectParentStatuses(node, edges, results)
          const onFailure = node.config?.onParentFailure ?? DEFAULT_ON_PARENT_FAILURE
          if (parentStatuses.hasNonSuccessful) {
            if (onFailure === 'skip') {
              const skipped: NodeResult = { nodeId, status: 'skipped' }
              results.set(nodeId, skipped)
              await ctx.onNodeStatusChange(nodeId, skipped)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'node_skipped',
                metadata: { reason: 'parent_not_successful' },
              })
              return
            }
            if (onFailure === 'propagate') {
              const failed: NodeResult = { nodeId, status: 'failed', error: 'upstream_failure' }
              results.set(nodeId, failed)
              await ctx.onNodeStatusChange(nodeId, failed)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'node_failed',
                metadata: { errorCode: 'upstream_failure' },
              })
              return
            }
            // substitute_default falls through and renders with empty values.
          }

          await ctx.onNodeStatusChange(nodeId, { nodeId, status: 'running' })
          await emit(ctx, { runId: ctx.runId, nodeId, name: 'node_started' })

          const attempts = Math.max(1, node.config?.retry?.attempts ?? DEFAULT_RETRY.attempts)
          const retryCfg: Required<RetryConfig> = {
            attempts,
            backoffMs: node.config?.retry?.backoffMs ?? DEFAULT_RETRY.backoffMs,
            maxBackoffMs: node.config?.retry?.maxBackoffMs ?? DEFAULT_RETRY.maxBackoffMs,
            retryOn: node.config?.retry?.retryOn ?? DEFAULT_RETRY.retryOn,
          }
          const timeoutMs = node.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS
          const moderationPolicy = node.config?.moderation ?? DEFAULT_MODERATION

          // Resolve template + contracts up-front (not retried on transient failures).
          let template: string
          try {
            template = await ctx.resolveLensTemplate(node.lensId, node.versionId)
          } catch (err) {
            const result: NodeResult = {
              nodeId,
              status: 'failed',
              error: `template_resolution_failed: ${errorMessage(err)}`,
            }
            results.set(nodeId, result)
            await ctx.onNodeStatusChange(nodeId, result)
            await emit(ctx, {
              runId: ctx.runId,
              nodeId,
              name: 'node_failed',
              metadata: { errorCode: 'template_resolution_failed' },
            })
            return
          }

          let contracts: { input: LensInputContract | null; output: LensOutputContract | null } = {
            input: null,
            output: null,
          }
          if (ctx.resolveVersionContracts && node.versionId) {
            try {
              contracts = await ctx.resolveVersionContracts(node.versionId)
            } catch {
              contracts = { input: null, output: null }
            }
          }

          const provenanceHandoffs: ProvenanceHandoff[] = []
          const renderedInputs = resolveRenderedInputs(
            node,
            edges,
            results,
            ctx.rootInputs,
            (handoff) => provenanceHandoffs.push(handoff),
            ctx.runId,
          )

          // Field-level provenance: emit one record per edge whose value was
          // actually used by this node. Best-effort — provenance writes must
          // never break execution.
          if (ctx.onProvenance) {
            await Promise.all(
              provenanceHandoffs.map(async (h) => {
                try {
                  await ctx.onProvenance!(h)
                  await emit(ctx, {
                    runId: ctx.runId,
                    nodeId: h.targetNodeId,
                    name: 'node_provenance',
                    metadata: {
                      sourceRunId: h.sourceRunId,
                      sourceNodeId: h.sourceNodeId,
                      sourceOutputPath: h.sourceOutputPath,
                      targetInputPath: h.targetInputPath,
                    },
                  })
                } catch {
                  // observability is best-effort
                }
              }),
            )
          }

          // Prompt rendering is strict about unresolved placeholders (§6.2).
          // A PlaceholderUnboundError surfaces as a `node.blocked` failure
          // with a structured errorCode so the UI can highlight which label
          // is missing on the graph.
          let resolvedPrompt: string
          try {
            resolvedPrompt = renderPrompt(template, renderedInputs, contracts.input)
          } catch (err) {
            if (err instanceof PlaceholderUnboundError) {
              // `blocked` is the canonical terminal status for unresolved
              // placeholders so the inspector renders the matching badge and
              // the run-state projection counts it under `failed_count`.
              const blocked: NodeResult = {
                nodeId,
                status: 'blocked',
                error: 'placeholder_unbound',
                outputData: { placeholder: err.label },
              }
              results.set(nodeId, blocked)
              await ctx.onNodeStatusChange(nodeId, blocked)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'node_blocked',
                metadata: { errorCode: 'placeholder_unbound', label: err.label },
              })
              return
            }
            throw err
          }

          // ── Input contract validation ───────────────────────────────
          const inputCheck = validateInputs(renderedInputs, contracts.input)
          if (!inputCheck.ok) {
            const result: NodeResult = {
              nodeId,
              status: 'failed',
              error: 'input_contract_violation',
              outputData: { contractErrors: inputCheck.errors },
            }
            results.set(nodeId, result)
            await ctx.onNodeStatusChange(nodeId, result)
            await emit(ctx, {
              runId: ctx.runId,
              nodeId,
              name: 'contract_violated',
              metadata: { phase: 'input', errors: inputCheck.errors },
            })
            return
          }

          // ── Input moderation ────────────────────────────────────────
          if (ctx.moderation && (moderationPolicy === 'input' || moderationPolicy === 'both')) {
            const decision = await safeCheck(ctx.moderation, 'input', resolvedPrompt, nodeId)
            if (!decision.allowed) {
              const result: NodeResult = {
                nodeId,
                status: 'failed',
                error: 'moderation_blocked',
                outputData: { moderation: decision },
              }
              results.set(nodeId, result)
              await ctx.onNodeStatusChange(nodeId, result)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'moderation_flagged',
                metadata: { phase: 'input', decision },
              })
              return
            }
          }

          // ── Provider call with retry + timeout ──────────────────────
          let envelope: NodeOutputEnvelope | null = null
          let providerError: { cause: RetryCause; err: unknown } | null = null
          let attempt = 0

          while (attempt < retryCfg.attempts) {
            attempt++
            if (isAborted()) break

            try {
              const execResult = await runWithTimeout(
                this.provider,
                node.lensId,
                { prompt: resolvedPrompt },
                timeoutMs,
                ctx.signal,
                ctx.onPartialOutput ? (partial) => ctx.onPartialOutput?.(nodeId, partial) : undefined,
              )
              envelope = toEnvelope(execResult, contracts.output)
              providerError = null
              break
            } catch (err) {
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

              const shouldRetry = attempt < retryCfg.attempts && retryCfg.retryOn.includes(cause)
              if (!shouldRetry) break

              const delay = computeBackoff(retryCfg.backoffMs, retryCfg.maxBackoffMs, attempt)
              const waitingReason: WaitingReason =
                cause === 'rate_limit' ? 'rate_limit' : 'retry_backoff'

              // Persist the waiting state so the inspector renders
              // "Waiting · retry backoff" while the timer ticks.
              const retrying: NodeResult = {
                nodeId,
                status: 'retrying',
                waitingReason,
                attempts: attempt,
              }
              results.set(nodeId, retrying)
              await ctx.onNodeStatusChange(nodeId, retrying)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'node_waiting',
                metadata: { waitingReason, attempt, cause, delayMs: delay },
              })
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'node_retried',
                metadata: { attempt, cause, delayMs: delay },
              })
              await sleep(delay, ctx.signal)
            }
          }

          if (isAbortError(providerError?.err) || isAborted()) {
            const cancelled: NodeResult = { nodeId, status: 'cancelled' }
            results.set(nodeId, cancelled)
            await ctx.onNodeStatusChange(nodeId, cancelled)
            await emit(ctx, { runId: ctx.runId, nodeId, name: 'node_cancelled' })
            return
          }

          if (providerError) {
            const cause = providerError.cause
            // Timeouts are persisted with the real `timed_out` status (Phase 1
            // aligns the DB constraint). All other causes remain `failed`.
            const terminalStatus: NodeStatus = cause === 'timeout' ? 'timed_out' : 'failed'
            const failed: NodeResult = {
              nodeId,
              status: terminalStatus,
              error: errorMessage(providerError.err),
              attempts: attempt,
            }
            results.set(nodeId, failed)
            await ctx.onNodeStatusChange(nodeId, failed)
            await emit(ctx, {
              runId: ctx.runId,
              nodeId,
              name: cause === 'timeout' ? 'timed_out' : 'node_failed',
              metadata: { errorCode: cause, attempts: attempt },
            })
            return
          }

          // ── Output moderation ───────────────────────────────────────
          if (
            envelope &&
            ctx.moderation &&
            (moderationPolicy === 'output' || moderationPolicy === 'both')
          ) {
            const decision = await safeCheck(ctx.moderation, 'output', envelope.output, nodeId)
            if (!decision.allowed) {
              const result: NodeResult = {
                nodeId,
                status: 'failed',
                error: 'moderation_blocked',
                outputData: { moderation: decision },
              }
              results.set(nodeId, result)
              await ctx.onNodeStatusChange(nodeId, result)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'moderation_flagged',
                metadata: { phase: 'output', decision },
              })
              return
            }
          }

          // ── Output contract validation ──────────────────────────────
          const outputCheck = validateOutput(envelope, contracts.output)
          if (!outputCheck.ok) {
            // Output contract violations graduate to `invalidated` — a
            // distinct terminal state that makes envelope-level failures
            // (as opposed to provider exceptions) trivially greppable in
            // the observability views.
            const result: NodeResult = {
              nodeId,
              status: 'invalidated',
              error: 'output_contract_violation',
              outputData: {
                contractErrors: outputCheck.errors,
                envelope,
              },
              attempts: attempt,
            }
            results.set(nodeId, result)
            await ctx.onNodeStatusChange(nodeId, result)
            await emit(ctx, {
              runId: ctx.runId,
              nodeId,
              name: 'contract_violated',
              metadata: { phase: 'output', errors: outputCheck.errors },
            })
            return
          }

          // ── Success ─────────────────────────────────────────────────
          const outputData: Record<string, unknown> = envelopeToOutputData(envelope!)
          const result: NodeResult = {
            nodeId,
            status: 'completed',
            envelope: envelope!,
            outputData,
            attempts: attempt,
          }
          results.set(nodeId, result)
          await ctx.onNodeStatusChange(nodeId, result)
          await emit(ctx, {
            runId: ctx.runId,
            nodeId,
            name: 'node_completed',
            metadata: { attempts: attempt },
          })
        }),
      )

      if (isAborted()) {
        await markRemainingCancelled()
        return finish(ctx.runId, results, 'cancelled')
      }

      // Build next wave: decrement dependents only for edges whose condition holds.
      const nextWave: string[] = []
      for (const nodeId of wave) {
        for (const dep of dependents.get(nodeId) ?? []) {
          const newDegree = (inDegree.get(dep) ?? 0) - 1
          inDegree.set(dep, newDegree)
          if (newDegree === 0) nextWave.push(dep)
        }
      }
      wave = nextWave
    }

    return finish(ctx.runId, results)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function safeStringify(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
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

function computeBackoff(baseMs: number, maxMs: number, attempt: number): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)))
  const jitter = 0.5 + Math.random() * 0.5
  return Math.round(exp * jitter)
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
  // Prefer streaming if the provider supports it and we have a partial sink.
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
  const envelope: NodeOutputEnvelope = {
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
  return envelope
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

function envelopeToOutputData(envelope: NodeOutputEnvelope): Record<string, unknown> {
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

function resolveRenderedInputs(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  results: Map<string, NodeResult>,
  rootInputs: Record<string, unknown>,
  onProvenance?: (handoff: ProvenanceHandoff) => void,
  runId: string = '',
): Record<string, unknown> {
  const incoming = edges.filter((e) => e.targetNodeId === node.id)
  const grouped = new Map<string, WorkflowEdge[]>()
  for (const edge of incoming) {
    const list = grouped.get(edge.targetParamLabel) ?? []
    list.push(edge)
    grouped.set(edge.targetParamLabel, list)
  }

  const defaultMerge = node.config?.merge ?? DEFAULT_MERGE
  const rendered: Record<string, unknown> = { ...rootInputs }

  for (const [label, group] of grouped.entries()) {
    const values: { sourceNodeId: string; value: unknown; sourceOutputKey: string }[] = []
    for (const edge of group) {
      if (!isEdgeConditionSatisfied(edge, results)) continue
      const source = results.get(edge.sourceNodeId)
      if (!source) continue
      if (source.status !== 'completed') continue
      const value = source.outputData?.[edge.sourceOutputKey] ?? source.envelope?.output ?? ''
      values.push({
        sourceNodeId: edge.sourceNodeId,
        value,
        sourceOutputKey: edge.sourceOutputKey,
      })

      if (onProvenance && runId) {
        onProvenance({
          sourceRunId: runId,
          sourceNodeId: edge.sourceNodeId,
          sourceOutputPath: edge.sourceOutputKey || 'output',
          targetRunId: runId,
          targetNodeId: node.id,
          targetInputPath: edge.targetParamLabel,
          transform: edge.mergeStrategy ? { mergeStrategy: edge.mergeStrategy } : null,
        })
      }
    }
    if (values.length === 0) {
      rendered[label] = rendered[label] ?? ''
      continue
    }

    const strategy: MergeStrategy = group[0]?.mergeStrategy ?? defaultMerge
    rendered[label] = applyMerge(strategy, values)
  }

  return rendered
}

function applyMerge(
  strategy: MergeStrategy,
  values: { sourceNodeId: string; value: unknown }[],
): unknown {
  switch (strategy) {
    case 'last_write_wins':
      return values[values.length - 1]?.value ?? ''
    case 'concat':
      return values.map((v) => safeStringify(v.value)).join('\n\n')
    case 'array':
      return values.map((v) => v.value)
    case 'json_object': {
      const obj: Record<string, unknown> = {}
      for (const v of values) obj[v.sourceNodeId] = v.value
      return obj
    }
  }
}

function isEdgeConditionSatisfied(edge: WorkflowEdge, results: Map<string, NodeResult>): boolean {
  if (!edge.condition) return true
  const source = results.get(edge.sourceNodeId)
  if (!source || source.status !== 'completed') return false
  const sourceValue = source.outputData?.[edge.sourceOutputKey] ?? source.envelope?.output ?? null
  switch (edge.condition.type) {
    case 'present':
      return sourceValue !== null && sourceValue !== undefined && sourceValue !== ''
    case 'truthy':
      return Boolean(sourceValue)
    case 'equals':
      return safeStringify(sourceValue) === safeStringify(edge.condition.value)
    case 'contains':
      return typeof sourceValue === 'string' && typeof edge.condition.value === 'string'
        ? sourceValue.includes(edge.condition.value)
        : false
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceTokenVariants(prompt: string, rawKey: string, value: unknown): string {
  const valueStr = typeof value === 'string' ? value : safeStringify(value)
  const normalized = rawKey.trim().replace(/\s+/g, '_').toLowerCase()
  const keyPattern = escapeRegExp(rawKey.trim()).replace(/_/g, '[ _]+')
  const normalizedPattern = escapeRegExp(normalized).replace(/_/g, '[ _]+')

  return prompt
    .replaceAll(`[[${rawKey}]]`, valueStr)
    .replaceAll(`[[${normalized}]]`, valueStr)
    .replaceAll(`{{${rawKey}}}`, valueStr)
    .replaceAll(`{{${normalized}}}`, valueStr)
    .replace(new RegExp(`\\[\\s+${keyPattern}\\s+\\]`, 'gi'), valueStr)
    .replace(new RegExp(`\\[\\s+${normalizedPattern}\\s+\\]`, 'gi'), valueStr)
}

/**
 * Unresolved placeholder pattern. Matches `[[label]]` / `[ label ]` /
 * `{{label}}` case-insensitively. The engine expects every placeholder to be
 * resolved OR for the corresponding contract field to be marked optional.
 */
const UNRESOLVED_PLACEHOLDER_RE = /(?:\[\[\s*([a-z0-9_ \-]+?)\s*\]\])|(?:\{\{\s*([a-z0-9_ \-]+?)\s*\}\})|(?:\[\s+([a-z0-9_ \-]+?)\s+\])/i

function renderPrompt(
  template: string,
  rendered: Record<string, unknown>,
  inputContract?: LensInputContract | null,
): string {
  let prompt = template
  for (const [key, value] of Object.entries(rendered)) {
    prompt = replaceTokenVariants(prompt, key, value)
  }

  // Strict placeholder-unbound check (§6.2). A placeholder that survived
  // expansion means the template asked for a label that neither bindings nor
  // rootInputs supplied AND the contract does not mark it optional.
  const leftover = UNRESOLVED_PLACEHOLDER_RE.exec(prompt)
  if (leftover) {
    const label = (leftover[1] ?? leftover[2] ?? leftover[3] ?? '').trim()
    if (label && !isLabelOptional(inputContract, label)) {
      throw new PlaceholderUnboundError(label)
    }
  }
  return prompt
}

function isLabelOptional(contract: LensInputContract | null | undefined, label: string): boolean {
  if (!contract) return false
  const normalized = label.trim().replace(/\s+/g, '_').toLowerCase()
  for (const [k, field] of Object.entries(contract.fields ?? {})) {
    const keyNorm = k.trim().replace(/\s+/g, '_').toLowerCase()
    if (keyNorm === normalized) {
      return field.required !== true
    }
  }
  return false
}

function collectParentStatuses(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  results: Map<string, NodeResult>,
): { hasNonSuccessful: boolean } {
  const parents = edges.filter((e) => e.targetNodeId === node.id).map((e) => e.sourceNodeId)
  if (parents.length === 0) return { hasNonSuccessful: false }
  for (const p of parents) {
    const r = results.get(p)
    if (!r) continue
    if (r.status !== 'completed') return { hasNonSuccessful: true }
  }
  return { hasNonSuccessful: false }
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

async function emit(ctx: WorkflowExecutionContext, event: EngineEvent): Promise<void> {
  if (!ctx.onEvent) return
  try {
    await ctx.onEvent(event)
  } catch {
    // observability failures must never break execution
  }
}

function finish(
  runId: string,
  results: Map<string, NodeResult>,
  override?: 'cancelled',
): WorkflowRunResult {
  const allResults = Array.from(results.values())
  if (override === 'cancelled') {
    return { runId, status: 'cancelled', nodeResults: allResults }
  }
  if (allResults.some((r) => r.status === 'cancelled')) {
    return { runId, status: 'cancelled', nodeResults: allResults }
  }
  // Phase 2 — every terminal non-success node status counts as a run failure
  // (not just `failed`). Without this, a run with a `timed_out`, `blocked`,
  // or `invalidated` node is misreported as "completed" to the UI.
  const failed = allResults.some(
    (r) =>
      r.status === 'failed' ||
      r.status === 'timed_out' ||
      r.status === 'blocked' ||
      r.status === 'invalidated',
  )
  return { runId, status: failed ? 'failed' : 'completed', nodeResults: allResults }
}
