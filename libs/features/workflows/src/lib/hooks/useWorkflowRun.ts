import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { WorkflowNodeResultRecord, WorkflowRunExecutor } from '@lenserfight/data/repositories'
import { isTerminalNodeStatus } from '@lenserfight/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

/**
 * How often a tab driving a client-executed run tells the server it is alive.
 * Comfortably inside the server's liveness window (5 min) so a handful of
 * dropped beats never gets a healthy run reaped, while staying cheap enough
 * that many concurrent tabs do not amount to meaningful RPC volume.
 */
const CLIENT_HEARTBEAT_MS = 30_000

export function useWorkflowRun(
  workflowId: string | undefined,
  options?: {
    skipSse?: boolean // kept for API compat — skipSse no longer needed
    /**
     * Attach to a run that already exists instead of waiting for startRun().
     * Lets the builder rehydrate from a /workflows/:id/run/:runId URL after a
     * refresh or a reopened tab, rather than rendering an empty builder while
     * the run is still going server-side.
     */
    initialRunId?: string | null
  },
) {
  const queryClient = useQueryClient()
  const [runId, setRunId] = useState<string | null>(options?.initialRunId ?? null)
  const [nodeResults, setNodeResults] = useState<WorkflowNodeResultRecord[]>([])
  const [isRunning, setIsRunning] = useState(false)
  // Only client-executed runs heartbeat; worker-executed runs prove liveness
  // server-side and must not be kept alive by a tab that is merely watching.
  const [executor, setExecutor] = useState<WorkflowRunExecutor | null>(null)
  // Run id whose executor this tab already knows first-hand, so the rehydration
  // lookup does not race (and overwrite) the value startRun set.
  const executorKnownForRunId = useRef<string | null>(null)

  // Rehydrate when the caller supplies a run id after mount (route param
  // resolving late, or navigating between runs).
  useEffect(() => {
    if (!options?.initialRunId) return
    setRunId((current) => (current === options.initialRunId ? current : options.initialRunId ?? null))
  }, [options?.initialRunId])

  const { mutateAsync: startRun, isPending } = useMutation({
    mutationFn: async ({
      inputs,
      globalModelId,
      idempotencyKey,
      executor: runExecutor = 'worker',
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
      /**
       * `worker` (default) hands the run to the server, so closing the tab does
       * not abandon it. `client` keeps execution in this tab — required for
       * user_byok_local, whose API key never leaves the browser.
       */
      executor?: WorkflowRunExecutor
    }) => {
      const key =
        idempotencyKey === null
          ? undefined
          : idempotencyKey ?? (await deriveIdempotencyKey(workflowId!, inputs))
      const run = await workflowsService.startRun(
        workflowId!,
        inputs,
        globalModelId,
        key,
        null,
        runExecutor,
      )
      return { run, executor: runExecutor }
    },
    onSuccess: ({ run, executor: runExecutor }) => {
      setRunId(run.id)
      executorKnownForRunId.current = run.id
      setExecutor(runExecutor)
      setNodeResults([])
      setIsRunning(true)
    },
  })

  // Client-executed liveness. Beats immediately on start so a run is never
  // judged from created_at alone, then on an interval until the run finishes or
  // the tab goes away — at which point the server stops hearing from us and the
  // reaper retires the run instead of leaving it pending forever.
  useEffect(() => {
    if (!runId || executor !== 'client' || !isRunning) return

    let cancelled = false
    const beat = () => {
      if (cancelled) return
      workflowsService.heartbeatClientRun(runId).catch(() => {
        // A dropped beat is recoverable; the liveness window spans many.
      })
    }
    beat()
    const timer = setInterval(beat, CLIENT_HEARTBEAT_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [runId, executor, isRunning])

  // Realtime subscription for node results
  useEffect(() => {
    if (!runId) return

    // Load initial node results. On a rehydrated run this is also what tells us
    // the run is still in flight — startRun() never fired in this tab, so
    // isRunning would otherwise stay false and the UI would render a live run as
    // idle.
    workflowsService.getNodeResults(runId).then((rows) => {
      setNodeResults(rows)
      // Only rows we actually have say anything about liveness. An empty array
      // means "not seeded yet" (the run was just created in this tab), NOT
      // "finished" — treating it as finished would stop the heartbeat on a run
      // that is about to start.
      if (rows.length === 0) return
      setIsRunning(!rows.every((r) => isTerminalNodeStatus(r.status)))
    })

    // Rehydration cannot know from node results alone who is executing, so ask.
    // Without this a reattached client-executed run would stop heartbeating and
    // be reaped while its tab is open. Skipped when this tab started the run and
    // therefore already knows — the lookup would otherwise race the value
    // startRun just set.
    if (executorKnownForRunId.current !== runId) {
      workflowsService
        .getRun(runId)
        .then((run) => {
          const runExecutor = (run as { executor?: WorkflowRunExecutor } | null)?.executor
          if (runExecutor === 'client' || runExecutor === 'worker') {
            executorKnownForRunId.current = runId
            setExecutor(runExecutor)
          }
        })
        .catch(() => {
          // Non-fatal: without it we simply do not heartbeat from this tab.
        })
    }

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
    executor,
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

