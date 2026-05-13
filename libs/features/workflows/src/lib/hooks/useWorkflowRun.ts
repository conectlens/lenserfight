import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import { isTerminalNodeStatus } from '@lenserfight/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'


export function useWorkflowRun(workflowId: string | undefined, options?: { skipSse?: boolean }) { // options kept for API compat — skipSse no longer needed
  const queryClient = useQueryClient()
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
      const allDone = rows.length > 0 && rows.every((r) => isTerminalNodeStatus(r.status))
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

            const allDone = next.length > 0 && next.every((r) => isTerminalNodeStatus(r.status))
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

  const stopRun = () => {
    if (!runId) return
    workflowsService.updateRunStatus(runId, 'cancelled').catch(() => {})
    setNodeResults((current) =>
      current.map((result) =>
        isTerminalNodeStatus(result.status)
          ? result
          : { ...result, status: 'cancelled', error_message: result.error_message ?? 'Run cancelled' }
      )
    )
    setIsRunning(false)
  }

  const { mutateAsync: retryRun, isPending: isRetrying } = useMutation({
    mutationFn: (targetRunId: string) =>
      workflowsService.updateRunStatus(targetRunId, 'queued'),
    onSuccess: (_data, targetRunId) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId, 'runs'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', 'run-state', targetRunId] })
    },
  })

  return {
    startRun,
    stopRun,
    retryRun,
    isPending,
    isRetrying,
    runId,
    nodeResults,
    isRunning,
  }
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

