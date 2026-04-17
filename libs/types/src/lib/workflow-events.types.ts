// Canonical workflow event taxonomy.
//
// This file is the single source of truth for every event emitted by the
// workflow execution engine, the SSE transport, and the client reducer.
// Historical drift (engine: "node_completed", transport: "node.completed")
// is resolved here: the dotted form is authoritative; engine-side names
// (`node_started`, etc.) are mapped through `ENGINE_EVENT_TO_SSE`.
//
// See docs/reference/workflows/execution-engine.md §Streaming model.

// ─── Canonical event type enum ─────────────────────────────────────────────

/**
 * Every event that crosses the engine/transport/client boundary.
 *
 * Scope:
 *   * `run.*`         — workflow-run-wide state changes.
 *   * `node.*`        — per-node lifecycle + streaming deltas.
 *   * `moderation.*`  — moderation gate verdicts.
 *   * `contract.*`    — contract validation failures.
 *   * `tool.*`        — legacy tool events (preserved for backwards
 *                       compatibility with the agent runtime).
 *   * `message.*`     — legacy text deltas (preserved; new code SHOULD emit
 *                       `node.stream.delta` instead).
 *   * `heartbeat`     — keep-alive.
 */
export const WorkflowEventType = {
  // Run-level
  RUN_STARTED: 'run.started',
  RUN_STATUS_CHANGED: 'run.status.changed',
  RUN_COMPLETED: 'run.completed',
  RUN_FAILED: 'run.failed',
  RUN_CANCELLED: 'run.cancelled',
  RUN_TIMED_OUT: 'run.timed_out',
  RUN_RECOVERED: 'run.recovered',
  // Node lifecycle
  NODE_QUEUED: 'node.queued',
  NODE_STARTED: 'node.started',
  NODE_STREAM_DELTA: 'node.stream.delta',
  NODE_LOG: 'node.log',
  NODE_RETRIED: 'node.retried',
  NODE_COMPLETED: 'node.completed',
  NODE_FAILED: 'node.failed',
  NODE_CANCELLED: 'node.cancelled',
  NODE_SKIPPED: 'node.skipped',
  NODE_TIMED_OUT: 'node.timed_out',
  NODE_BLOCKED: 'node.blocked',
  NODE_INVALIDATED: 'node.invalidated',
  // Gates / validation surfaces
  MODERATION_FLAGGED: 'moderation.flagged',
  CONTRACT_VIOLATED: 'contract.violated',
  // Transport liveness
  HEARTBEAT: 'heartbeat',
  // Legacy (kept for backward compatibility with existing clients)
  MESSAGE_DELTA: 'message.delta',
  MESSAGE_COMPLETED: 'message.completed',
  TOOL_STARTED: 'tool.started',
  TOOL_PROGRESS: 'tool.progress',
  TOOL_COMPLETED: 'tool.completed',
  TOOL_FAILED: 'tool.failed',
  TOOL_APPROVAL_REQUIRED: 'tool.approval_required',
  TOOL_APPROVAL_RESPONSE: 'tool.approval_response',
} as const

export type WorkflowEventType = (typeof WorkflowEventType)[keyof typeof WorkflowEventType]

/**
 * Convenience alias — `WorkflowSseEventType` is the older name still in use
 * across the code-base. Keep both pointing at the same union so every call
 * site benefits from the richer taxonomy.
 */
export type WorkflowSseEventType = WorkflowEventType

/** Type-guard for run-scoped event types. */
export function isRunScopedEvent(type: string): boolean {
  return type.startsWith('run.') || type === WorkflowEventType.HEARTBEAT
}

/** Type-guard for terminal run-level event types. */
export function isTerminalRunEventType(type: string): boolean {
  return (
    type === WorkflowEventType.RUN_COMPLETED ||
    type === WorkflowEventType.RUN_FAILED ||
    type === WorkflowEventType.RUN_CANCELLED ||
    type === WorkflowEventType.RUN_TIMED_OUT
  )
}

/** Type-guard for node-scoped event types. */
export function isNodeScopedEvent(type: string): boolean {
  return type.startsWith('node.')
}

/** Type-guard for node-terminal event types. */
export function isTerminalNodeEventType(type: string): boolean {
  return (
    type === WorkflowEventType.NODE_COMPLETED ||
    type === WorkflowEventType.NODE_FAILED ||
    type === WorkflowEventType.NODE_CANCELLED ||
    type === WorkflowEventType.NODE_SKIPPED ||
    type === WorkflowEventType.NODE_TIMED_OUT ||
    type === WorkflowEventType.NODE_INVALIDATED
  )
}

// ─── Envelope ──────────────────────────────────────────────────────────────

/**
 * The envelope shape written to `lenses.workflow_run_events` and framed onto
 * SSE. `eventId` is monotonic per `runId` via advisory-lock allocation in
 * `fn_append_workflow_run_event`. `sequence` mirrors `eventId`; it is carried
 * explicitly so consumers that rebase onto different transports (Realtime,
 * WebSocket) never need a second field.
 */
export interface WorkflowSseEventEnvelope<
  TType extends WorkflowSseEventType = WorkflowSseEventType,
  TPayload = Record<string, unknown>,
> {
  eventId: number
  /** Convenience mirror of `eventId`. Always equal. */
  sequence?: number
  type: TType
  runId: string
  /** Set when the producer knows it — helps client rehydrate without a fetch. */
  workflowId?: string
  timestamp: string
  /** Correlation/trace metadata; populated by the emitter. */
  correlation?: {
    traceId?: string
    parentEventId?: number
    wave?: number
    phase?: 'engine' | 'transport' | 'client'
  }
  payload: TPayload
}

// ─── Payload shapes ────────────────────────────────────────────────────────

export interface WorkflowSseNodePayload {
  runId: string
  nodeId: string
  status?: string
  message?: string
  output?: string
  attempts?: number
}

/**
 * Payload for `node.stream.delta`. `deltaIndex` is monotonic per `nodeId` and
 * lets the client assemble chunks even when SSE frames arrive out of order or
 * are retransmitted.
 */
export interface NodeStreamDeltaPayload {
  runId: string
  nodeId: string
  deltaIndex: number
  text: string
  /** Hint for the UI — `text` / `image` / `json` etc. */
  kind?: string
}

export interface NodeRetriedPayload {
  runId: string
  nodeId: string
  attempt: number
  cause: 'timeout' | 'provider_error' | 'rate_limit' | 'contract_violated'
  delayMs: number
}

export interface NodeCompletedPayload {
  runId: string
  nodeId: string
  envelope?: unknown
  creditsCharged?: number
  durationMs?: number
}

// ─── Engine → SSE mapping ──────────────────────────────────────────────────

/**
 * Historical engine events use snake_case (e.g. `node_completed`). The SSE
 * taxonomy is dotted (`node.completed`). This map is the single translation
 * point — every emit site MUST go through it to prevent drift.
 */
export const ENGINE_EVENT_TO_SSE: Record<string, WorkflowEventType> = {
  node_queued: WorkflowEventType.NODE_QUEUED,
  node_started: WorkflowEventType.NODE_STARTED,
  node_retried: WorkflowEventType.NODE_RETRIED,
  node_completed: WorkflowEventType.NODE_COMPLETED,
  node_failed: WorkflowEventType.NODE_FAILED,
  node_cancelled: WorkflowEventType.NODE_CANCELLED,
  node_skipped: WorkflowEventType.NODE_SKIPPED,
  node_blocked: WorkflowEventType.NODE_BLOCKED,
  node_invalidated: WorkflowEventType.NODE_INVALIDATED,
  node_stream_delta: WorkflowEventType.NODE_STREAM_DELTA,
  node_log: WorkflowEventType.NODE_LOG,
  timed_out: WorkflowEventType.NODE_TIMED_OUT,
  contract_violated: WorkflowEventType.CONTRACT_VIOLATED,
  moderation_flagged: WorkflowEventType.MODERATION_FLAGGED,
  run_started: WorkflowEventType.RUN_STARTED,
  run_status_changed: WorkflowEventType.RUN_STATUS_CHANGED,
  run_completed: WorkflowEventType.RUN_COMPLETED,
  run_failed: WorkflowEventType.RUN_FAILED,
  run_cancelled: WorkflowEventType.RUN_CANCELLED,
  run_timed_out: WorkflowEventType.RUN_TIMED_OUT,
  run_recovered: WorkflowEventType.RUN_RECOVERED,
  heartbeat: WorkflowEventType.HEARTBEAT,
}

/**
 * Map an engine-side event name (snake_case or already dotted) onto the
 * canonical SSE taxonomy. Falls back to replacing underscores with dots,
 * which preserves the pre-existing best-effort behaviour.
 */
export function mapEngineEventToSse(name: string): WorkflowEventType {
  const mapped = ENGINE_EVENT_TO_SSE[name]
  if (mapped) return mapped
  // Already dotted — trust it if it matches the enum's runtime shape.
  if (name.includes('.')) return name as WorkflowEventType
  return name.replace(/_/g, '.') as WorkflowEventType
}

// ─── Status enums (aligned with DB check constraints) ──────────────────────

/** All statuses a workflow run may occupy. Mirrors the DB check constraint. */
export const WORKFLOW_RUN_STATUSES = [
  'draft',
  'validated',
  'queued',
  'pending',
  'running',
  'streaming',
  'recovered',
  'completed',
  'failed',
  'cancelled',
  'timed_out',
] as const
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number]

/** All statuses a workflow-node result may occupy. Mirrors the DB check constraint. */
export const WORKFLOW_NODE_STATUSES = [
  'pending',
  'awaiting_dependency',
  'queued',
  'running',
  'streaming',
  'retrying',
  'completed',
  'failed',
  'cancelled',
  'skipped',
  'timed_out',
  'blocked',
  'invalidated',
] as const
export type WorkflowNodeStatus = (typeof WORKFLOW_NODE_STATUSES)[number]

export const TERMINAL_NODE_STATUSES: readonly WorkflowNodeStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'skipped',
  'timed_out',
  'blocked',
  'invalidated',
]

export const TERMINAL_RUN_STATUSES: readonly WorkflowRunStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'timed_out',
]

export function isTerminalNodeStatus(status: string): status is WorkflowNodeStatus {
  return (TERMINAL_NODE_STATUSES as readonly string[]).includes(status)
}

export function isTerminalRunStatus(status: string): status is WorkflowRunStatus {
  return (TERMINAL_RUN_STATUSES as readonly string[]).includes(status)
}
