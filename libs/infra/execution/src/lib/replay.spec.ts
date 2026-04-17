import { describe, it, expect } from 'vitest'

import { replayRunEvents, type ReplayEvent } from './replay'
import { WorkflowEventType } from '@lenserfight/types'

/**
 * Phase 7 — Recovery: golden-file replay tests.
 *
 * Each test expresses an invariant: given an event log, the reducer must
 * produce exactly this state. Because the reducer is pure, we can assert
 * against shape + numeric fields without timers or mocks.
 */

const nodeA = 'node-a'
const nodeB = 'node-b'

function ev(eventId: number, type: string, payload: Record<string, unknown> = {}): ReplayEvent {
  return { eventId, type, payload }
}

describe('replayRunEvents', () => {
  it('treats empty event log as queued run with known nodes pending', () => {
    const state = replayRunEvents([], { knownNodeIds: [nodeA, nodeB] })

    expect(state.runStatus).toBe('queued')
    expect(state.terminal).toBe(false)
    expect(state.lastEventId).toBe(0)
    expect(state.unresolvedNodeIds.sort()).toEqual([nodeA, nodeB])
    expect(state.interruptedNodeIds).toEqual([])
    expect(state.nodes.get(nodeA)?.status).toBe('pending')
  })

  it('marks run complete after a full successful sequence', () => {
    const events: ReplayEvent[] = [
      ev(1, WorkflowEventType.RUN_STARTED, { status: 'running' }),
      ev(2, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
      ev(3, WorkflowEventType.NODE_COMPLETED, { nodeId: nodeA, durationMs: 1200, retries: 0 }),
      ev(4, WorkflowEventType.NODE_STARTED, { nodeId: nodeB }),
      ev(5, WorkflowEventType.NODE_COMPLETED, { nodeId: nodeB, durationMs: 500 }),
      ev(6, WorkflowEventType.RUN_COMPLETED, {}),
    ]

    const state = replayRunEvents(events)
    expect(state.runStatus).toBe('completed')
    expect(state.terminal).toBe(true)
    expect(state.lastEventId).toBe(6)
    expect(state.unresolvedNodeIds).toEqual([])
    expect(state.nodes.get(nodeA)?.status).toBe('completed')
    expect(state.nodes.get(nodeA)?.durationMs).toBe(1200)
    expect(state.nodes.get(nodeB)?.status).toBe('completed')
  })

  it('flags a mid-stream crash as interrupted for resume', () => {
    const events: ReplayEvent[] = [
      ev(1, WorkflowEventType.RUN_STARTED, { status: 'running' }),
      ev(2, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
      ev(3, WorkflowEventType.NODE_STREAM_DELTA, { nodeId: nodeA, deltaIndex: 0, text: 'Hel' }),
      ev(4, WorkflowEventType.NODE_STREAM_DELTA, { nodeId: nodeA, deltaIndex: 1, text: 'Hello' }),
      // Crash: no node.completed / run.completed / run.failed.
    ]

    const state = replayRunEvents(events, { knownNodeIds: [nodeA, nodeB] })

    expect(state.terminal).toBe(false)
    expect(state.unresolvedNodeIds.sort()).toEqual([nodeA, nodeB])
    expect(state.interruptedNodeIds).toEqual([nodeA])

    const a = state.nodes.get(nodeA)!
    expect(a.status).toBe('streaming')
    expect(a.lastDeltaIndex).toBe(1)
    expect(a.streamedText).toBe('Hello')
  })

  it('is idempotent against duplicate and out-of-order deltas', () => {
    // Monotonic deltaIndex guarantees: the reducer must ignore strictly lower
    // indices even when the event log replays them (e.g. after SSE reconnect).
    const events: ReplayEvent[] = [
      ev(1, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
      ev(2, WorkflowEventType.NODE_STREAM_DELTA, { nodeId: nodeA, deltaIndex: 2, text: 'abc' }),
      ev(3, WorkflowEventType.NODE_STREAM_DELTA, { nodeId: nodeA, deltaIndex: 0, text: 'zzz' }),
      ev(4, WorkflowEventType.NODE_STREAM_DELTA, { nodeId: nodeA, deltaIndex: 2, text: 'shouldnotwin' }),
    ]
    const state = replayRunEvents(events)

    const a = state.nodes.get(nodeA)!
    expect(a.lastDeltaIndex).toBe(2)
    expect(a.streamedText).toBe('abc')
  })

  it('honours terminal node statuses and ignores later stray events', () => {
    const events: ReplayEvent[] = [
      ev(1, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
      ev(2, WorkflowEventType.NODE_FAILED, { nodeId: nodeA, error: 'boom', errorCode: 'provider_error' }),
      // Stray retry/delta after terminal must not revive the node.
      ev(3, WorkflowEventType.NODE_STREAM_DELTA, { nodeId: nodeA, deltaIndex: 5, text: 'late' }),
      ev(4, WorkflowEventType.NODE_RETRIED, { nodeId: nodeA, attempt: 99 }),
    ]
    const state = replayRunEvents(events)

    const a = state.nodes.get(nodeA)!
    expect(a.status).toBe('failed')
    expect(a.terminal).toBe(true)
    expect(a.error).toBe('boom')
    expect(a.errorCode).toBe('provider_error')
    expect(state.unresolvedNodeIds).toEqual([])
  })

  it('sorts events defensively and respects ascending eventId', () => {
    const events: ReplayEvent[] = [
      ev(3, WorkflowEventType.NODE_COMPLETED, { nodeId: nodeA }),
      ev(1, WorkflowEventType.RUN_STARTED, { status: 'running' }),
      ev(2, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
    ]
    const state = replayRunEvents(events)

    expect(state.lastEventId).toBe(3)
    expect(state.nodes.get(nodeA)?.status).toBe('completed')
    expect(state.runStatus).toBe('running')
  })

  it('marks run recovered after RUN_RECOVERED without finalising', () => {
    const events: ReplayEvent[] = [
      ev(1, WorkflowEventType.RUN_STARTED, { status: 'running' }),
      ev(2, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
      ev(3, WorkflowEventType.RUN_RECOVERED, {}),
    ]
    const state = replayRunEvents(events)

    expect(state.runStatus).toBe('recovered')
    expect(state.terminal).toBe(false)
    expect(state.interruptedNodeIds).toEqual([nodeA])
  })

  it('counts retries from NODE_RETRIED attempt field', () => {
    const events: ReplayEvent[] = [
      ev(1, WorkflowEventType.NODE_STARTED, { nodeId: nodeA }),
      ev(2, WorkflowEventType.NODE_RETRIED, { nodeId: nodeA, attempt: 2 }),
      ev(3, WorkflowEventType.NODE_RETRIED, { nodeId: nodeA, attempt: 3 }),
      ev(4, WorkflowEventType.NODE_COMPLETED, { nodeId: nodeA, retries: 2 }),
    ]
    const state = replayRunEvents(events)
    const a = state.nodes.get(nodeA)!
    expect(a.retries).toBe(2)
    expect(a.attempts).toBeGreaterThanOrEqual(3)
    expect(a.status).toBe('completed')
  })
})
