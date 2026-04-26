// Replay reducer — Phase 7 (Recovery).
//
// Given the ordered sequence of `workflow_run_events` persisted for a run,
// rebuild the authoritative engine state (run status + per-node lifecycle)
// that a recovered worker needs in order to resume execution safely.
//
// This module is pure and dependency-free:
//   * No IO.
//   * No `Date` / random / clocks.
//   * Deterministic for a given input sequence.
//
// This lets us back it with golden-file tests (see `replay.spec.ts`) and
// reuse the same reducer in the UI (`useWorkflowRun`) and in the worker
// recovery loop.

import { WorkflowEventType, isRunScopedEvent } from '@lenserfight/types'
import type { WorkflowEventType as WorkflowEventTypeT } from '@lenserfight/types'

// ── Types ──────────────────────────────────────────────────────────────────

export type WorkflowRunReplayStatus =
  | 'queued'
  | 'running'
  | 'streaming'
  | 'recovered'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'

export type NodeReplayStatus =
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

export interface ReplayEvent {
  eventId: number
  type: string
  payload?: Record<string, unknown> | null
  timestamp?: string
}

export interface ReplayNodeState {
  nodeId: string
  status: NodeReplayStatus
  attempts: number
  retries: number
  /** Highest deltaIndex observed for this node. -1 before any delta. */
  lastDeltaIndex: number
  /** Aggregated streaming text buffer (best-effort; lossy for non-text nodes). */
  streamedText: string
  lastEventId: number
  error?: string
  errorCode?: string
  durationMs?: number
  ttfbMs?: number
  terminal: boolean
}

export interface ReplayState {
  runStatus: WorkflowRunReplayStatus
  lastEventId: number
  terminal: boolean
  nodes: Map<string, ReplayNodeState>
  /** Nodes that still need executing when the worker resumes. */
  unresolvedNodeIds: string[]
  /** Nodes that were mid-stream when the worker crashed. */
  interruptedNodeIds: string[]
}

export interface ReplayOptions {
  /** Node IDs known to exist in the workflow definition. Used to seed pending nodes. */
  knownNodeIds?: string[]
}

// ── Public API ─────────────────────────────────────────────────────────────

export function replayRunEvents(
  events: ReplayEvent[],
  options: ReplayOptions = {},
): ReplayState {
  const state: ReplayState = {
    runStatus: 'queued',
    lastEventId: 0,
    terminal: false,
    nodes: new Map<string, ReplayNodeState>(),
    unresolvedNodeIds: [],
    interruptedNodeIds: [],
  }

  // Seed known nodes as `pending` so the reducer can distinguish "not yet
  // seen" from "observed as pending".
  for (const nodeId of options.knownNodeIds ?? []) {
    if (!state.nodes.has(nodeId)) {
      state.nodes.set(nodeId, newNodeState(nodeId))
    }
  }

  // Events MUST be replayed in ascending eventId order. We sort defensively;
  // the DB already returns them sorted, but tests feed arbitrary orderings.
  const sorted = [...events].sort((a, b) => a.eventId - b.eventId)

  for (const ev of sorted) {
    applyEvent(state, ev)
    if (ev.eventId > state.lastEventId) state.lastEventId = ev.eventId
  }

  // Derive summary collections AFTER all events are folded.
  for (const node of state.nodes.values()) {
    if (isTerminalNodeStatus(node.status)) continue
    state.unresolvedNodeIds.push(node.nodeId)
    if (node.status === 'streaming' || node.status === 'retrying' || node.status === 'running') {
      state.interruptedNodeIds.push(node.nodeId)
    }
  }

  return state
}

// ── Internals ──────────────────────────────────────────────────────────────

function newNodeState(nodeId: string): ReplayNodeState {
  return {
    nodeId,
    status: 'pending',
    attempts: 0,
    retries: 0,
    lastDeltaIndex: -1,
    streamedText: '',
    lastEventId: 0,
    terminal: false,
  }
}

function getOrCreateNode(state: ReplayState, nodeId: string): ReplayNodeState {
  let node = state.nodes.get(nodeId)
  if (!node) {
    node = newNodeState(nodeId)
    state.nodes.set(nodeId, node)
  }
  return node
}

function applyEvent(state: ReplayState, ev: ReplayEvent): void {
  const type = ev.type as WorkflowEventTypeT | string
  const payload = (ev.payload ?? {}) as Record<string, unknown>

  // Run-scoped events update top-level status.
  if (isRunScopedEvent(type)) {
    switch (type) {
      case WorkflowEventType.RUN_STARTED:
      case WorkflowEventType.RUN_STATUS_CHANGED:
        state.runStatus = coerceRunStatus(payload['status'], state.runStatus)
        break
      case WorkflowEventType.RUN_COMPLETED:
        state.runStatus = 'completed'
        state.terminal = true
        break
      case WorkflowEventType.RUN_FAILED:
        state.runStatus = 'failed'
        state.terminal = true
        break
      case WorkflowEventType.RUN_CANCELLED:
        state.runStatus = 'cancelled'
        state.terminal = true
        break
      case WorkflowEventType.RUN_TIMED_OUT:
        state.runStatus = 'timed_out'
        state.terminal = true
        break
      case WorkflowEventType.RUN_RECOVERED:
        state.runStatus = 'recovered'
        state.terminal = false
        break
      default:
        break
    }
    return
  }

  // Node-scoped events require a node id.
  const nodeId = typeof payload['nodeId'] === 'string' ? (payload['nodeId'] as string) : null
  if (!nodeId) return
  const node = getOrCreateNode(state, nodeId)
  node.lastEventId = ev.eventId

  switch (type) {
    case WorkflowEventType.NODE_QUEUED:
      if (!node.terminal) node.status = 'queued'
      break
    case WorkflowEventType.NODE_WAITING:
      if (!node.terminal) {
        // Map waiting reasons to the engine's node status taxonomy. Reasons
        // tied to "queued for next wave" or "awaiting upstream" map to the
        // pre-execution lifecycle states; rate_limit / retry_backoff map to
        // `retrying` because the node has already been attempted at least
        // once.
        const reason = typeof payload['waitingReason'] === 'string'
          ? (payload['waitingReason'] as string)
          : null
        if (reason === 'rate_limit' || reason === 'retry_backoff') {
          node.status = 'retrying'
        } else if (reason === 'queued') {
          node.status = 'queued'
        } else {
          node.status = 'awaiting_dependency'
        }
      }
      break
    case WorkflowEventType.NODE_PROVENANCE:
      // Pure audit signal — does not advance node lifecycle. Capturing it in
      // the reducer ensures the replay driver does not log warnings about
      // unknown event types and keeps `lastEventId` accurate.
      break
    case WorkflowEventType.NODE_STARTED:
      if (!node.terminal) {
        node.status = 'running'
        node.attempts = Math.max(1, node.attempts)
      }
      break
    case WorkflowEventType.NODE_STREAM_DELTA: {
      if (node.terminal) break
      node.status = 'streaming'
      const deltaIndex = toNumber(payload['deltaIndex'], -1)
      if (deltaIndex > node.lastDeltaIndex) {
        node.lastDeltaIndex = deltaIndex
        const text = typeof payload['text'] === 'string' ? (payload['text'] as string) : ''
        // Protocol: `text` is the cumulative buffer, `deltaText` the incremental
        // slice. Prefer cumulative when provided — matches useWorkflowRun.
        if (text) node.streamedText = text
        else if (typeof payload['deltaText'] === 'string') {
          node.streamedText += payload['deltaText'] as string
        }
      }
      break
    }
    case WorkflowEventType.NODE_RETRIED:
      if (!node.terminal) {
        node.status = 'retrying'
        node.attempts = toNumber(payload['attempt'], node.attempts + 1)
        node.retries = Math.max(0, node.attempts - 1)
      }
      break
    case WorkflowEventType.NODE_COMPLETED:
      node.status = 'completed'
      node.terminal = true
      node.durationMs = toOptionalNumber(payload['durationMs'])
      node.ttfbMs = toOptionalNumber(payload['ttfbMs'])
      node.retries = toNumber(payload['retries'], node.retries)
      break
    case WorkflowEventType.NODE_FAILED:
      node.status = 'failed'
      node.terminal = true
      node.error = toOptionalString(payload['error'])
      node.errorCode = toOptionalString(payload['errorCode'])
      break
    case WorkflowEventType.NODE_CANCELLED:
      node.status = 'cancelled'
      node.terminal = true
      break
    case WorkflowEventType.NODE_SKIPPED:
      node.status = 'skipped'
      node.terminal = true
      break
    case WorkflowEventType.NODE_TIMED_OUT:
      node.status = 'timed_out'
      node.terminal = true
      node.errorCode = 'timeout'
      break
    case WorkflowEventType.NODE_BLOCKED:
      node.status = 'blocked'
      node.terminal = true
      node.errorCode = toOptionalString(payload['errorCode']) ?? 'blocked'
      break
    case WorkflowEventType.NODE_INVALIDATED:
      node.status = 'invalidated'
      node.terminal = true
      node.errorCode = toOptionalString(payload['errorCode']) ?? 'contract_violated'
      break
    default:
      break
  }
}

function isTerminalNodeStatus(status: NodeReplayStatus): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'skipped' ||
    status === 'timed_out' ||
    status === 'blocked' ||
    status === 'invalidated'
  )
}

function coerceRunStatus(
  raw: unknown,
  fallback: WorkflowRunReplayStatus,
): WorkflowRunReplayStatus {
  if (typeof raw !== 'string') return fallback
  switch (raw) {
    case 'queued':
    case 'running':
    case 'streaming':
    case 'recovered':
    case 'completed':
    case 'failed':
    case 'cancelled':
    case 'timed_out':
      return raw
    default:
      return fallback
  }
}

function toNumber(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback
  return raw
}

function toOptionalNumber(raw: unknown): number | undefined {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
}

function toOptionalString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}
