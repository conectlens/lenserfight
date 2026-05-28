// WorkflowRunEventLog — Phase 8 audit/debug tab. Reads from
// `workflow_run_events` via `useWorkflowRunEvents`, renders a time-ordered
// log of the run's engine events (run lifecycle + node transitions).
//
// The component is deliberately small and self-contained; it does NOT own
// any SSE state. For live reassembly see `useWorkflowRun`.

import { WorkflowEventType, isTerminalRunEventType } from '@lenserfight/types'
import { Loader, RefreshCw } from 'lucide-react'
import React, { useMemo } from 'react'

import { useWorkflowRunEvents } from '../hooks/useWorkflowRunEvents'

import type { WorkflowRunEventRecord } from '@lenserfight/data/repositories'

export interface WorkflowRunEventLogProps {
  runId: string | undefined
  /** Tail the log live via polling while the run is in flight. Default false. */
  liveTail?: boolean
}

export function WorkflowRunEventLog({ runId, liveTail = false }: WorkflowRunEventLogProps) {
  const { events, isLoading, isFetchingMore, error, hasMore, loadMore, refresh } =
    useWorkflowRunEvents(runId, { poll: liveTail })

  const terminal = useMemo(() => events.some((e) => isTerminalRunEventType(e.type)), [events])

  if (!runId) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
        No run selected.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-greyscale-500">
          <span className="font-mono text-greyscale-700 dark:text-greyscale-200">
            {events.length}
          </span>
          event{events.length === 1 ? '' : 's'}
          {terminal && <span className="ml-2 text-status-green">· run complete</span>}
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-1 rounded-md border border-surface-border bg-surface-base px-2 py-1 text-[11px] text-greyscale-600 hover:text-greyscale-900 disabled:opacity-50"
        >
          <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="border-b border-status-red/30 bg-status-red/5 px-3 py-2 text-[11px] text-status-red">
          {error.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
            <Loader size={14} className="mr-2 animate-spin" /> Loading events…
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
            No events yet.
          </div>
        ) : (
          <ol className="divide-y divide-surface-border">
            {events.map((ev) => (
              <EventRow key={`${ev.run_id}:${ev.event_id}`} event={ev} />
            ))}
          </ol>
        )}

        {hasMore && events.length > 0 && (
          <div className="px-3 py-3">
            <button
              type="button"
              onClick={() => loadMore()}
              disabled={isFetchingMore}
              className="w-full rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-[11px] text-greyscale-600 hover:text-greyscale-900 disabled:opacity-50"
            >
              {isFetchingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EventRow({ event }: { event: WorkflowRunEventRecord }) {
  const tone = toneFor(event.type)
  const nodeId = typeof event.payload?.nodeId === 'string' ? event.payload.nodeId : null
  const summary = summarisePayload(event.payload)

  return (
    <li className="px-3 py-2 text-[11px] font-mono">
      <div className="flex items-start gap-2">
        <span className="min-w-[7ch] text-greyscale-400">#{event.event_id}</span>
        <span className={`min-w-[18ch] ${tone}`}>{event.type}</span>
        <span className="min-w-[12ch] text-greyscale-400">
          {formatTs(event.timestamp)}
        </span>
        <span className="min-w-0 flex-1 truncate text-greyscale-700 dark:text-greyscale-200">
          {nodeId ? `node=${nodeId.slice(0, 8)} ` : ''}
          {summary}
        </span>
      </div>
    </li>
  )
}

function toneFor(type: string): string {
  if (type.startsWith('run.')) {
    if (type === WorkflowEventType.RUN_COMPLETED) return 'text-status-green'
    if (
      type === WorkflowEventType.RUN_FAILED ||
      type === WorkflowEventType.RUN_CANCELLED ||
      type === WorkflowEventType.RUN_TIMED_OUT
    )
      return 'text-status-red'
    return 'text-primary-yellow-600 dark:text-primary-yellow-400'
  }
  if (
    type === WorkflowEventType.NODE_COMPLETED ||
    type === WorkflowEventType.NODE_STREAM_DELTA
  )
    return 'text-status-green'
  if (
    type === WorkflowEventType.NODE_FAILED ||
    type === WorkflowEventType.NODE_TIMED_OUT ||
    type === WorkflowEventType.NODE_BLOCKED ||
    type === WorkflowEventType.NODE_INVALIDATED
  )
    return 'text-status-red'
  return 'text-greyscale-700 dark:text-greyscale-200'
}

function formatTs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(11, 19)
}

function summarisePayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) return ''
  // Render the most informative fields inline without dumping the whole JSON.
  const bits: string[] = []
  if (typeof payload['status'] === 'string') bits.push(`status=${payload['status']}`)
  if (typeof payload['attempt'] === 'number') bits.push(`attempt=${payload['attempt']}`)
  if (typeof payload['errorCode'] === 'string') bits.push(`code=${payload['errorCode']}`)
  if (typeof payload['durationMs'] === 'number') bits.push(`dur=${Math.round(Number(payload['durationMs']))}ms`)
  if (typeof payload['deltaIndex'] === 'number') bits.push(`Δ=${payload['deltaIndex']}`)
  if (typeof payload['error'] === 'string') bits.push(`"${(payload['error'] as string).slice(0, 80)}"`)
  return bits.join(' ')
}
