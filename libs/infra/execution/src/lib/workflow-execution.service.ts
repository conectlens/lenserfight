import { validateInputs, validateOutput } from './contract-validator'
import { detectCycle as validatorDetectCycle, PlaceholderUnboundError } from './validator'
import { shouldHaltScheduling, type BudgetSnapshot } from './budget-reconciler'
import { inferAttachmentsFromRendered } from './execution-attachments'
import { resolveMappedOutputValue } from './output-path'
import { getNodeRunner } from './runners/node-runner.registry'
import type { NodeRunnerContext } from './runners/node-runner.interface'

import type {
  ExecutionInput,
  ExecutionResult,
  IExecutionProvider,
  IStreamingExecutionProvider,
  ModerationDecision,
  ModerationGateway,
  ModerationPhase,
  PartialOutputSink,
  WorkflowNodeType,
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

/**
 * When buffered memory entries written during a node's execution are flushed
 * to durable storage.
 *
 * - `on_success` (default) — entries are flushed only when the entire run
 *   reaches `'completed'`. A failed run discards every buffered entry,
 *   preserving the "memory only reflects successful work" invariant.
 *
 * - `checkpoint` — entries are flushed as soon as the writing node itself
 *   completes. Memory survives downstream node failures. Use for
 *   long-running orchestration workflows where intermediate findings should
 *   not be lost when a later node errors out.
 */
export type MemoryWritePolicy = 'on_success' | 'checkpoint'

/**
 * Phase X2 — controls whether a node is allowed to delegate work to another
 * agent (e.g. via `delegate_to_agent` workflow steps that spawn child
 * `agents.team_runs`).
 *
 * - `auto` (default) — delegation runs immediately as part of the workflow.
 * - `approval_required` — the delegation step is gated by the same approval
 *   queue used for human-in-the-loop nodes. The runtime is expected to call
 *   `agents.fn_node_requires_review` and pause the run until cleared.
 * - `forbidden` — delegation is rejected outright. Useful for sensitive
 *   workflows that must execute end-to-end on a single agent.
 *
 * Phase AL — the delegation runtime is now wired. The engine consults
 * `WorkflowExecutionContext.delegation` (an `IDelegationHandler`) when a
 * node executes a delegate_to_agent action; the policy resolved here is
 * passed through to `agents.fn_start_team_run` as `p_policy`, which enforces
 * `forbidden` server-side. The helpers below remain the canonical entry
 * points for engine code that needs to short-circuit a forbidden delegation
 * before any RPC call.
 */
export type DelegationPolicy = 'auto' | 'approval_required' | 'forbidden'

export interface WorkflowNodeConfig {
  retry?: RetryConfig
  timeoutMs?: number
  onParentFailure?: OnParentFailurePolicy
  merge?: MergeStrategy
  moderation?: ModerationConfig['policy']
  /** Phase N2 — controls when buffered memory writes are flushed. Default `on_success`. */
  memoryWritePolicy?: MemoryWritePolicy
  /** Phase X2 — controls delegation behavior for this node. Default `auto`. */
  delegationPolicy?: DelegationPolicy
  /** AP: output modality for this node — checked against agents.policies.allowed_output_modalities. */
  nodeType?: WorkflowNodeType
  /** Per-node AIModel.key override; falls back to run-level `defaultModelKey`. */
  modelId?: string
}

/**
 * Phase X2 — resolve the effective delegation policy for a node config.
 * Returns the configured policy or the supplied default (defaults to `'auto'`).
 *
 * The future delegation runtime will call this when it encounters a
 * `delegate_to_agent` action to determine whether to dispatch immediately,
 * route through the approval queue, or reject the delegation.
 */
export function resolveDelegationPolicy(
  nodeConfig: WorkflowNodeConfig | undefined,
  defaultPolicy: DelegationPolicy = 'auto'
): DelegationPolicy {
  return nodeConfig?.delegationPolicy ?? defaultPolicy
}

/**
 * Phase X2 — throw if the node's delegation policy forbids delegation.
 * The future delegation runtime is expected to call this at the moment a
 * delegation action is encountered, before any side-effects.
 */
export function assertDelegationAllowed(
  nodeConfig: WorkflowNodeConfig | undefined
): void {
  const policy = resolveDelegationPolicy(nodeConfig)
  if (policy === 'forbidden') {
    throw new Error(
      'Delegation is forbidden by node configuration (delegationPolicy=forbidden).'
    )
  }
}

export interface WorkflowNode {
  id: string
  lensId: string | null
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
  /** Label→value map after edge merge (for audit / replay). */
  resolvedInputSnapshot?: Record<string, unknown>
  /** Provider + model used for this node. */
  providerRoute?: Record<string, unknown>
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
  | 'node_provenance'

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
  /**
   * Default model key for `IExecutionProvider.execute` when a node has no
   * `config.modelId`.
   */
  defaultModelKey?: string
  /** Optional abort signal for cancellation-aware execution */
  signal?: AbortSignal
  /** Resolves a lens version's template body by lensId + versionId */
  resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string>
  /**
   * When set, returns the provider to use for this node (mixed text + media DAGs).
   * If omitted, the service was constructed with a single global provider.
   */
  resolveExecutionProvider?(node: WorkflowNode): IExecutionProvider | Promise<IExecutionProvider>
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
  /**
   * Phase N2 — optional sink for memory-flush events. The caller decides
   * whether to maintain a buffer; the engine simply notifies the sink at the
   * right moments and lets it act on the per-node policy.
   *
   * - `onNodeCompleted(nodeId, policy)` is called after each successful node
   *   transition to `'completed'`. Implementations whose policy is
   *   `'checkpoint'` should flush that node's buffered memory entries here.
   *
   * - `onRunCompleted(status)` is called when the run reaches a terminal
   *   status. Implementations whose policy is `'on_success'` should flush the
   *   remaining buffered memory entries when status === 'completed', or
   *   discard them otherwise.
   *
   * Errors thrown by the sink are swallowed — memory flushing is
   * observational, not load-bearing.
   */
  memory?: MemoryFlushSink
  /**
   * Phase AL — delegation dispatcher. When set, the engine calls this on
   * `delegate_to_agent` actions. When unset, delegation actions surface as
   * a node failure with code `delegation_not_configured`.
   */
  delegation?: DelegationDispatcher
  /**
   * AP — optional modality guard. When set, the engine calls this before
   * dispatching any non-text generative node. Implementations should call
   * fn_assert_modality_allowed. If the modality is disallowed, throw with
   * message 'modality_not_allowed'. The engine converts this to node_blocked.
   */
  modalityGuard?: (nodeId: string, modality: WorkflowNodeType) => Promise<void>
  /**
   * Z10 — optional budget snapshot provider. Before each wave the engine
   * calls this; if it returns a snapshot and `shouldHaltScheduling` signals
   * `cancel`, the run is cancelled with reason `budget_exceeded`. Workers
   * handling user-triggered runs should provide a snapshot reflecting the
   * run's `budget_credits` and current `spent_credits`. Service-role workers
   * that are uncapped may omit this field entirely.
   */
  getBudgetSnapshot?: () => BudgetSnapshot | null
  /**
   * Z10 — max number of nodes to run concurrently within a single wave.
   * Defaults to MAX_WAVE_CONCURRENCY (10). Lower values reduce provider
   * thundering-herd; higher values maximise throughput on large fan-out graphs.
   */
  maxWaveConcurrency?: number
}

export interface MemoryFlushSink {
  onNodeCompleted?(nodeId: string, policy: MemoryWritePolicy): void | Promise<void>
  onRunCompleted?(status: 'completed' | 'failed' | 'cancelled'): void | Promise<void>
}

/**
 * Phase AL — handler used by the engine when a node executes a
 * `delegate_to_agent` action. Returns the spawned `agents.team_runs.id`.
 * The concrete impls live in `delegation-handler.ts`:
 *   - `SupabaseDelegationHandler` — production path; calls
 *     `agents.fn_start_team_run`.
 *   - `NullDelegationHandler` — tests/dry-run; throws
 *     `delegation_not_configured`.
 *
 * Re-exported here as a structural type so consumers don't have to import
 * from two places to wire up the engine.
 */
export interface DelegationDispatcher {
  dispatchTeamRun(input: {
    aiLenserId: string
    workflowId: string
    inputs: Record<string, unknown>
    policy: DelegationPolicy
  }): Promise<{ teamRunId: string }>
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

// Z10: concurrency cap — max nodes executed simultaneously within one wave.
// Prevents thundering-herd on AI providers when a workflow fans out widely.
const MAX_WAVE_CONCURRENCY = 10

// Z10: context byte ceiling — max serialised size of merged inputs passed to
// a single node. Prevents MB-scale context accumulation in long chains.
const MAX_CONTEXT_BYTES = 512 * 1024 // 512 KB

// Z10: exported so workers can reference the same value when building budget
// snapshots for user-initiated runs.
export const DEFAULT_MAX_USER_BUDGET_CREDITS = 50_000

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

    const notifyMemoryRunCompleted = async (
      status: 'completed' | 'failed' | 'cancelled',
    ) => {
      if (!ctx.memory?.onRunCompleted) return
      try {
        await ctx.memory.onRunCompleted(status)
      } catch {
        // Memory flush is observational; never block the run.
      }
    }

    let wave = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)

    // Z10: concurrency limiter — shared across all waves so the total number
    // of simultaneously-running nodes never exceeds maxWaveConcurrency.
    const throttle = makeSemaphore(ctx.maxWaveConcurrency ?? MAX_WAVE_CONCURRENCY)

    while (wave.length > 0) {
      if (isAborted()) {
        await markRemainingCancelled()
        const cancelledResult = finish(ctx.runId, results, 'cancelled')
        await notifyMemoryRunCompleted(cancelledResult.status)
        return cancelledResult
      }

      // Z10: budget check — abort before executing a new wave if the caller
      // signals that the run's credit budget is exhausted.
      if (ctx.getBudgetSnapshot) {
        const snap = ctx.getBudgetSnapshot()
        if (snap && shouldHaltScheduling(snap)) {
          await markRemainingCancelled()
          await emit(ctx, {
            runId: ctx.runId,
            nodeId: wave[0] ?? '',
            name: 'node_failed',
            metadata: { errorCode: 'budget_exceeded' },
          })
          const cancelledResult = finish(ctx.runId, results, 'cancelled')
          await notifyMemoryRunCompleted(cancelledResult.status)
          return cancelledResult
        }
      }

      await Promise.all(
        wave.map((nodeId) => throttle(async () => {
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

          // AP: modality guard — block non-text nodes when agent policy disallows the modality
          const nodeType = node.config?.nodeType
          if (
            ctx.modalityGuard &&
            nodeType &&
            nodeType !== 'text' &&
            nodeType !== 'condition' &&
            nodeType !== 'merge' &&
            nodeType !== 'delegate'
          ) {
            try {
              await ctx.modalityGuard(nodeId, nodeType)
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err)
              const isModalityBlocked = errMsg.includes('modality_not_allowed')
              const blocked: NodeResult = {
                nodeId,
                status: 'blocked',
                error: isModalityBlocked ? 'modality_not_allowed' : `modality_guard_error: ${errMsg}`,
                outputData: { modality: nodeType },
              }
              results.set(nodeId, blocked)
              await ctx.onNodeStatusChange(nodeId, blocked)
              await emit(ctx, {
                runId: ctx.runId,
                nodeId,
                name: 'node_blocked',
                metadata: { errorCode: 'modality_not_allowed', modality: nodeType },
              })
              return
            }
          }

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
          // Utility nodes (null lensId) skip template resolution — they are
          // dispatched via the node runner registry below.
          let template: string
          if (!node.lensId) {
            template = ''
          } else {
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

          // Z10: context size guard — reject inputs that exceed the byte
          // ceiling before they reach the provider. This prevents a long chain
          // from accumulating MB-scale context that would inflate token costs.
          const contextSize = JSON.stringify(renderedInputs).length
          if (contextSize > MAX_CONTEXT_BYTES) {
            const ctxTooBig: NodeResult = {
              nodeId,
              status: 'failed',
              error: 'context_too_large',
            }
            results.set(nodeId, ctxTooBig)
            await ctx.onNodeStatusChange(nodeId, ctxTooBig)
            await emit(ctx, {
              runId: ctx.runId,
              nodeId,
              name: 'node_failed',
              metadata: { errorCode: 'context_too_large', sizeBytes: contextSize },
            })
            return
          }

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

          // ── CN: Node Runner dispatch — utility nodes bypass the provider pipeline ──
          const runnerNodeType = node.config?.nodeType
          const nodeRunner = runnerNodeType ? getNodeRunner(runnerNodeType) : undefined
          if (nodeRunner) {
            const upstreamOutputs = new Map<string, ExecutionResult>()
            for (const [nId, res] of results.entries()) {
              if (res.envelope) {
                upstreamOutputs.set(nId, {
                  mediaType: (res.envelope.kind ?? 'text') as ExecutionResult['mediaType'],
                  text: res.envelope.output,
                  url: res.envelope.media?.url,
                  data: res.outputData,
                  durationMs: typeof res.envelope.metadata?.['durationMs'] === 'number'
                    ? res.envelope.metadata['durationMs']
                    : undefined,
                })
              }
            }
            const runnerCtx: NodeRunnerContext = {
              nodeId,
              upstreamOutputs,
              resolvedParams: { ...renderedInputs },
              nodeConfig: (node.config as Record<string, unknown>) ?? {},
              signal: ctx.signal,
            }
            try {
              const runnerResult = await nodeRunner.execute(runnerCtx)
              // Apply variable mutations to the root inputs for downstream
              if (runnerResult.variableMutations && ctx.rootInputs) {
                Object.assign(ctx.rootInputs, runnerResult.variableMutations)
              }
              const envelope = toEnvelope(runnerResult.output, contracts.output)
              const outputData = { ...envelopeToOutputData(envelope), ...(runnerResult.output.data ?? {}) }
              const result: NodeResult = { nodeId, status: 'completed', envelope, outputData, attempts: 1, resolvedInputSnapshot: renderedInputs }
              results.set(nodeId, result)
              await ctx.onNodeStatusChange(nodeId, result)
              await emit(ctx, { runId: ctx.runId, nodeId, name: 'node_completed', metadata: { durationMs: runnerResult.output.durationMs } })
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err)
              const result: NodeResult = { nodeId, status: 'failed', error: errMsg }
              results.set(nodeId, result)
              await ctx.onNodeStatusChange(nodeId, result)
              await emit(ctx, { runId: ctx.runId, nodeId, name: 'node_failed', metadata: { error: errMsg } })
            }
            return
          }

          // ── Provider call with retry + timeout ──────────────────────
          const nodeProvider = ctx.resolveExecutionProvider
            ? await ctx.resolveExecutionProvider(node)
            : this.provider
          const rawCfg = node.config as Record<string, unknown> | undefined
          const modelKey = (
            node.config?.modelId?.trim() ||
            (typeof rawCfg?.['model_id'] === 'string' ? rawCfg['model_id'].trim() : '') ||
            ctx.defaultModelKey ||
            ''
          ).trim()
          const attachments = inferAttachmentsFromRendered(renderedInputs)
          const execInputBase: ExecutionInput = {
            prompt: resolvedPrompt,
            ...(attachments.length > 0 ? { attachments } : {}),
          }

          let envelope: NodeOutputEnvelope | null = null
          let providerError: { cause: RetryCause; err: unknown } | null = null
          let attempt = 0

          while (attempt < retryCfg.attempts) {
            attempt++
            if (isAborted()) break

            try {
              const execResult = await runWithTimeout(
                nodeProvider,
                modelKey || node.lensId || nodeId,
                execInputBase,
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

          const routeMeta = { providerId: nodeProvider.id, modelKey: modelKey || node.lensId || nodeId }
          const inputSnapshot = { ...renderedInputs }

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
              resolvedInputSnapshot: inputSnapshot,
              providerRoute: routeMeta,
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
            resolvedInputSnapshot: inputSnapshot,
            providerRoute: routeMeta,
          }
          results.set(nodeId, result)
          await ctx.onNodeStatusChange(nodeId, result)
          await emit(ctx, {
            runId: ctx.runId,
            nodeId,
            name: 'node_completed',
            metadata: { attempts: attempt },
          })

          // Phase N2 — notify the memory sink so it can checkpoint-flush.
          if (ctx.memory?.onNodeCompleted) {
            const policy: MemoryWritePolicy =
              node.config?.memoryWritePolicy ?? 'on_success'
            try {
              await ctx.memory.onNodeCompleted(nodeId, policy)
            } catch {
              // Memory flush is observational; never block the run.
            }
          }
        })),
      )

      if (isAborted()) {
        await markRemainingCancelled()
        const cancelledResult = finish(ctx.runId, results, 'cancelled')
        await notifyMemoryRunCompleted(cancelledResult.status)
        return cancelledResult
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

    const finalResult = finish(ctx.runId, results)
    await notifyMemoryRunCompleted(finalResult.status)
    return finalResult
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

// Inline semaphore — avoids an external dependency for a 12-line utility.
// Returns a wrapper that runs `fn` immediately when a slot is free, or queues
// it until a running slot finishes.
function makeSemaphore(limit: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0
  const queue: Array<() => void> = []
  return function throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active++
        fn().then(resolve, reject).finally(() => {
          active--
          queue.shift()?.()
        })
      }
      if (active < limit) {
        run()
      } else {
        queue.push(run)
      }
    })
  }
}

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
      const value = resolveMappedOutputValue(
        {
          status: source.status,
          outputData: source.outputData,
          envelope: source.envelope,
        },
        edge.sourceOutputKey,
      )
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
  const sourceValue = resolveMappedOutputValue(
    {
      status: source.status,
      outputData: source.outputData,
      envelope: source.envelope,
    },
    edge.sourceOutputKey,
  )
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
