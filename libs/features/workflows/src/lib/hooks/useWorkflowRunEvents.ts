// useWorkflowRunEvents — paginated fetch of `workflow_run_events` for the
// audit/event-log tab (Phase 8).
//
// Uses `workflowsService.listRunEvents` which is a thin wrapper around the
// `fn_list_workflow_run_events` RPC. The RPC is cursor-based: pass the last
// observed `event_id` to fetch the next page.
//
// This hook intentionally does NOT subscribe via Realtime. Live updates are
// already delivered to the run view via SSE / `useWorkflowRun`; the event log
// is a separate concern (audit trail, debugging), and users often want a
// stable, paginated snapshot — not a cursor that moves while they read.

import { workflowsService } from '@lenserfight/data/repositories'
import type { WorkflowRunEventRecord } from '@lenserfight/data/repositories'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseWorkflowRunEventsOptions {
  /** Page size. Defaults to 100. Capped at 1000 by the RPC. */
  pageSize?: number
  /** When true, the hook keeps polling for new events until the run is terminal. */
  poll?: boolean
  /** Poll interval in ms. Default 2000. */
  pollIntervalMs?: number
}

export interface UseWorkflowRunEventsResult {
  events: WorkflowRunEventRecord[]
  isLoading: boolean
  isFetchingMore: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useWorkflowRunEvents(
  runId: string | undefined,
  options: UseWorkflowRunEventsOptions = {},
): UseWorkflowRunEventsResult {
  const { pageSize = 100, poll = false, pollIntervalMs = 2000 } = options

  const [events, setEvents] = useState<WorkflowRunEventRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // Last seen event_id — updated after every successful fetch. Kept in a ref
  // so callbacks can read it without triggering re-renders.
  const lastEventIdRef = useRef(0)
  const runIdRef = useRef(runId)

  // Reset when runId changes so we never leak events across runs.
  useEffect(() => {
    runIdRef.current = runId
    setEvents([])
    setError(null)
    setHasMore(true)
    lastEventIdRef.current = 0
  }, [runId])

  const fetchPage = useCallback(
    async (afterEventId: number): Promise<WorkflowRunEventRecord[]> => {
      if (!runIdRef.current) return []
      const rows = await workflowsService.listRunEvents(
        runIdRef.current,
        afterEventId,
        pageSize,
      )
      return rows
    },
    [pageSize],
  )

  const refresh = useCallback(async () => {
    if (!runId) return
    setIsLoading(true)
    setError(null)
    try {
      const rows = await fetchPage(0)
      setEvents(rows)
      lastEventIdRef.current = rows.length > 0 ? rows[rows.length - 1].event_id : 0
      setHasMore(rows.length === pageSize)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setIsLoading(false)
    }
  }, [runId, fetchPage, pageSize])

  const loadMore = useCallback(async () => {
    if (!runId || isFetchingMore || !hasMore) return
    setIsFetchingMore(true)
    try {
      const rows = await fetchPage(lastEventIdRef.current)
      if (rows.length > 0) {
        setEvents((prev) => {
          // Defensive de-dup by event_id — the RPC is strict, but reconnect
          // flows might double-fetch the boundary row.
          const seen = new Set(prev.map((r) => r.event_id))
          const fresh = rows.filter((r) => !seen.has(r.event_id))
          return prev.concat(fresh)
        })
        lastEventIdRef.current = rows[rows.length - 1].event_id
      }
      setHasMore(rows.length === pageSize)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setIsFetchingMore(false)
    }
  }, [runId, isFetchingMore, hasMore, fetchPage, pageSize])

  // Initial load
  useEffect(() => {
    if (!runId) return
    refresh()
  }, [runId, refresh])

  // Optional polling for live tail.
  useEffect(() => {
    if (!poll || !runId) return
    let timer: ReturnType<typeof setInterval> | null = null
    timer = setInterval(() => {
      // Best-effort tail: fetch after the last seen event; if a full page came
      // back we flip hasMore on so the user can continue paginating.
      if (!runId) return
      fetchPage(lastEventIdRef.current)
        .then((rows) => {
          if (rows.length === 0) return
          setEvents((prev) => {
            const seen = new Set(prev.map((r) => r.event_id))
            const fresh = rows.filter((r) => !seen.has(r.event_id))
            if (fresh.length === 0) return prev
            return prev.concat(fresh)
          })
          lastEventIdRef.current = rows[rows.length - 1].event_id
          if (rows.length === pageSize) setHasMore(true)
        })
        .catch(() => {
          // Swallow transient polling errors; the next tick retries.
        })
    }, pollIntervalMs)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [poll, runId, fetchPage, pageSize, pollIntervalMs])

  return {
    events,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}
