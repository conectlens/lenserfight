import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import type { WorkflowSseEventEnvelope } from '@lenserfight/types'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { Dispatch, SetStateAction } from 'react'

export function useWorkflowRun(workflowId: string | undefined) {
  const [runId, setRunId] = useState<string | null>(null)
  const [nodeResults, setNodeResults] = useState<WorkflowNodeResultRecord[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const { mutateAsync: startRun, isPending } = useMutation({
    mutationFn: ({ inputs, globalModelId }: { inputs: Record<string, unknown>; globalModelId?: string }) =>
      workflowsService.startRun(workflowId!, inputs, globalModelId),
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
  return type === 'run.completed' || type === 'run.failed' || type === 'run.cancelled'
}

function applyWorkflowSseEnvelope(
  envelope: WorkflowSseEventEnvelope,
  setNodeResults: Dispatch<SetStateAction<WorkflowNodeResultRecord[]>>,
  setIsRunning: Dispatch<SetStateAction<boolean>>,
) {
  if (envelope.type === 'run.status.changed') {
    const status = String((envelope.payload as Record<string, unknown>)['status'] ?? '').toLowerCase()
    if (status === 'running' || status === 'queued' || status === 'starting') {
      setIsRunning(true)
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
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
    if (envelope.type.startsWith('node.')) {
      const suffix = envelope.type.split('.')[1]
      if (suffix === 'started') status = 'running'
      else if (suffix === 'completed') status = 'completed'
      else if (suffix === 'failed') status = 'failed'
      else if (suffix === 'cancelled') status = 'cancelled'
      else if (suffix === 'skipped') status = 'skipped'
      else if (suffix === 'retried') status = 'running'
    }

    const delta = typeof payload['delta'] === 'string' ? (payload['delta'] as string) : null
    const previousText =
      typeof existing.output_data?.['output'] === 'string'
        ? (existing.output_data?.['output'] as string)
        : typeof existing.output_data?.['text'] === 'string'
          ? (existing.output_data?.['text'] as string)
          : ''
    const outputData =
      delta != null
        ? {
            ...(existing.output_data ?? {}),
            output: `${previousText}${delta}`,
            text: `${previousText}${delta}`,
            streaming: true,
          }
        : existing.output_data

    const updated: WorkflowNodeResultRecord = {
      ...existing,
      status,
      output_data: outputData,
      error_message:
        status === 'failed'
          ? String(payload['error'] ?? existing.error_message ?? 'Node failed')
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
