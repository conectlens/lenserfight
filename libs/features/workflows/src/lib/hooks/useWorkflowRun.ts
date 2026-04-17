import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import {
  WorkflowEventType,
  isTerminalRunEventType,
  type WorkflowSseEventEnvelope,
} from '@lenserfight/types'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { Dispatch, SetStateAction } from 'react'

export function useWorkflowRun(workflowId: string | undefined) {
  const [runId, setRunId] = useState<string | null>(null)
  const [nodeResults, setNodeResults] = useState<WorkflowNodeResultRecord[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const { mutateAsync: startRun, isPending } = useMutation({
    mutationFn: async ({
      inputs,
      globalModelId,
      idempotencyKey,
    }: {
      inputs: Record<string, unknown>
      globalModelId?: string
      /**
       * Phase 9 — when provided, repeated submissions with the same key return
       * the original run id instead of starting a new one. If omitted, the hook
       * derives a stable key from sha256(workflowId || canonicalInputs) so UI
       * double-clicks / React StrictMode double-invocations never create dup
       * runs. Pass `null` to opt out.
       */
      idempotencyKey?: string | null
    }) => {
      const key =
        idempotencyKey === null
          ? undefined
          : idempotencyKey ?? (await deriveIdempotencyKey(workflowId!, inputs))
      return workflowsService.startRun(workflowId!, inputs, globalModelId, key)
    },
    onSuccess: (run) => {
      setRunId(run.id)
      setNodeResults([])
      setIsRunning(true)
    },
  })

  // Realtime subscription for node results
  useEffect(() => {
    if (!runId) return

    // Load initial node results
    workflowsService.getNodeResults(runId).then((rows) => {
      setNodeResults(rows)
      const allDone =
        rows.length > 0 &&
        rows.every(
          (r) =>
            r.status === 'completed' ||
            r.status === 'failed' ||
            r.status === 'cancelled' ||
            r.status === 'skipped'
        )
      if (allDone) setIsRunning(false)
    })

    const channel = supabase
      .channel(`workflow-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'lenses',
          table: 'workflow_node_results',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          if (!payload.new) return
          const updated = payload.new as WorkflowNodeResultRecord
          setNodeResults((prev) => {
            const idx = prev.findIndex((r) => r.id === updated.id)
            const next = idx === -1 ? [...prev, updated] : [...prev]
            if (idx !== -1) {
              next[idx] = updated
            }

            const allDone =
              next.length > 0 &&
              next.every(
                (r) =>
                  r.status === 'completed' ||
                  r.status === 'failed' ||
                  r.status === 'cancelled' ||
                  r.status === 'skipped'
              )
            if (allDone) setIsRunning(false)
            return next
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId])

  // SSE stream (platform API) for rich workflow timeline events.
  // Realtime remains as a fallback and source of truth for persisted rows.
  useEffect(() => {
    if (!runId) return
    const apiBase = import.meta.env.VITE_API_URL as string | undefined
    if (!apiBase) return

    const controller = new AbortController()
    let lastEventId = 0
    let done = false

    const connect = async () => {
      while (!controller.signal.aborted && !done) {
        try {
          const { data } = await supabase.auth.getSession()
          const token = data.session?.access_token
          if (!token) return

          const res = await fetch(`${apiBase}/execute/workflows/${runId}/events?afterEventId=${lastEventId}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
          })
          if (!res.ok || !res.body) return

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (!controller.signal.aborted) {
            const { done: streamDone, value } = await reader.read()
            if (streamDone) break

            buffer += decoder.decode(value, { stream: true })
            let splitIdx = buffer.indexOf('\n\n')
            while (splitIdx !== -1) {
              const raw = buffer.slice(0, splitIdx)
              buffer = buffer.slice(splitIdx + 2)
              const parsed = parseSseBlock(raw)
              if (parsed?.id != null && Number.isFinite(parsed.id)) {
                lastEventId = Math.max(lastEventId, parsed.id)
              }
              if (!parsed?.data) {
                splitIdx = buffer.indexOf('\n\n')
                continue
              }
              try {
                const envelope = JSON.parse(parsed.data) as WorkflowSseEventEnvelope
                if (isTerminalRunEvent(envelope.type)) {
                  done = true
                }
                applyWorkflowSseEnvelope(envelope, setNodeResults, setIsRunning)
              } catch {
                // ignore malformed event frames
              }
              splitIdx = buffer.indexOf('\n\n')
            }
          }
        } catch {
          // best-effort reconnect
        }

        if (!controller.signal.aborted && !done) {
          await sleep(1000, controller.signal)
        }
      }
    }

    connect()
    return () => controller.abort()
  }, [runId])

  const stopRun = () => {
    if (!runId) return
    workflowsService.updateRunStatus(runId, 'cancelled').catch(() => {})
    setNodeResults((current) =>
      current.map((result) =>
        result.status === 'completed' || result.status === 'failed' || result.status === 'skipped'
          ? result
          : { ...result, status: 'cancelled', error_message: result.error_message ?? 'Run cancelled' }
      )
    )
    setIsRunning(false)
  }

  return {
    startRun,
    stopRun,
    isPending,
    runId,
    nodeResults,
    isRunning,
  }
}

function isTerminalRunEvent(type: string): boolean {
  return isTerminalRunEventType(type)
}

/**
 * Derives a deterministic idempotency key from the workflow id and the
 * canonical (sorted-keys) JSON form of the submitted inputs. The Web Crypto
 * API is available in every supported browser + in the Cloudflare Worker
 * runtime, so this is safe to run server-side in RSC code paths too.
 */
async function deriveIdempotencyKey(
  workflowId: string,
  inputs: Record<string, unknown>,
): Promise<string> {
  const canonical = canonicalJsonStringify(inputs)
  const data = new TextEncoder().encode(`${workflowId}|${canonical}`)
  // Fall back to a time-bucketed hash on runtimes missing SubtleCrypto.
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return `${workflowId}-${Math.floor(Date.now() / 5000)}`
  }
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(hash)
}

function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJsonStringify(v)).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJsonStringify(v)}`)
    .join(',')}}`
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

/**
 * Per-node delta high-water-mark. Lives at module scope because a single
 * `useWorkflowRun` mounts once per workflow view; the reducer is idempotent
 * against duplicate delta frames thanks to `deltaIndex` tracking.
 */
const seenDeltaIndex = new Map<string, number>()

function applyWorkflowSseEnvelope(
  envelope: WorkflowSseEventEnvelope,
  setNodeResults: Dispatch<SetStateAction<WorkflowNodeResultRecord[]>>,
  setIsRunning: Dispatch<SetStateAction<boolean>>,
) {
  if (envelope.type === WorkflowEventType.RUN_STATUS_CHANGED) {
    const status = String((envelope.payload as Record<string, unknown>)['status'] ?? '').toLowerCase()
    if (
      status === 'running' ||
      status === 'streaming' ||
      status === 'queued' ||
      status === 'starting' ||
      status === 'recovered'
    ) {
      setIsRunning(true)
    } else if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'timed_out'
    ) {
      setIsRunning(false)
    }
    return
  }

  if (isTerminalRunEvent(envelope.type)) {
    setIsRunning(false)
    return
  }

  const nodeId = String((envelope.payload as Record<string, unknown>)['nodeId'] ?? '')
  if (!nodeId) return

  setNodeResults((prev) => {
    const idx = prev.findIndex((r) => r.node_id === nodeId)
    const next = [...prev]
    const existing =
      idx >= 0
        ? next[idx]
        : ({
            id: `sse-${envelope.runId}-${nodeId}`,
            run_id: envelope.runId,
            node_id: nodeId,
            status: 'pending',
            output_data: null,
          } as WorkflowNodeResultRecord)

    const payload = envelope.payload as Record<string, unknown>
    let status = existing.status
    if (envelope.type === WorkflowEventType.NODE_STARTED) status = 'running'
    else if (envelope.type === WorkflowEventType.NODE_STREAM_DELTA) status = 'streaming'
    else if (envelope.type === WorkflowEventType.NODE_COMPLETED) status = 'completed'
    else if (envelope.type === WorkflowEventType.NODE_FAILED) status = 'failed'
    else if (envelope.type === WorkflowEventType.NODE_CANCELLED) status = 'cancelled'
    else if (envelope.type === WorkflowEventType.NODE_SKIPPED) status = 'skipped'
    else if (envelope.type === WorkflowEventType.NODE_TIMED_OUT) status = 'timed_out'
    else if (envelope.type === WorkflowEventType.NODE_BLOCKED) status = 'blocked'
    else if (envelope.type === WorkflowEventType.NODE_INVALIDATED) status = 'invalidated'
    else if (envelope.type === WorkflowEventType.NODE_RETRIED) status = 'retrying'
    else if (envelope.type === WorkflowEventType.NODE_QUEUED) status = 'queued'
    // `message.delta` kept for legacy compatibility with older producers.
    else if (envelope.type === WorkflowEventType.MESSAGE_DELTA) status = 'streaming'

    // Pick up text from either the canonical `text` field (node.stream.delta)
    // or the legacy `delta` field (message.delta). `deltaIndex` is used to
    // skip duplicate frames on reconnect.
    const deltaText =
      typeof payload['text'] === 'string'
        ? (payload['text'] as string)
        : typeof payload['delta'] === 'string'
          ? (payload['delta'] as string)
          : null

    let shouldApplyDelta = deltaText != null
    if (shouldApplyDelta && typeof payload['deltaIndex'] === 'number') {
      const key = `${envelope.runId}:${nodeId}`
      const seen = seenDeltaIndex.get(key) ?? -1
      const idxNum = payload['deltaIndex'] as number
      if (idxNum <= seen) shouldApplyDelta = false
      else seenDeltaIndex.set(key, idxNum)
    }

    const previousText =
      typeof existing.output_data?.['output'] === 'string'
        ? (existing.output_data?.['output'] as string)
        : typeof existing.output_data?.['text'] === 'string'
          ? (existing.output_data?.['text'] as string)
          : ''
    const outputData =
      shouldApplyDelta && deltaText != null
        ? {
            ...(existing.output_data ?? {}),
            output: `${previousText}${deltaText}`,
            text: `${previousText}${deltaText}`,
            streaming: true,
          }
        : existing.output_data

    const updated: WorkflowNodeResultRecord = {
      ...existing,
      status,
      output_data: outputData,
      error_message:
        status === 'failed' || status === 'timed_out' || status === 'invalidated'
          ? String(payload['error'] ?? payload['errorMessage'] ?? existing.error_message ?? 'Node failed')
          : existing.error_message,
    }

    if (idx >= 0) {
      next[idx] = updated
    } else {
      next.push(updated)
    }
    return next
  })
}

function parseSseBlock(raw: string): { id?: number; event?: string; data?: string } | null {
  if (!raw.trim()) return null
  const lines = raw.split('\n')
  let id: number | undefined
  let event: string | undefined
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('id:')) {
      const v = Number(line.slice(3).trim())
      if (Number.isFinite(v)) id = v
      continue
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  return { id, event, data: dataLines.join('\n') }
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), ms)
    if (!signal) return
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}
