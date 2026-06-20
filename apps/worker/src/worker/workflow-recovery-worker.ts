// Workflow crash-recovery worker (H3).
//
// The DB already ships the recovery primitives (fn_claim_stale_workflow_run +
// fn_heartbeat_workflow_run + v_workflow_run_health) but nothing invoked them,
// so a run whose worker died mid-execution stayed 'running' forever. This loop
// claims stale runs (heartbeat older than the threshold, or never stamped) and
// re-executes them through the shared executor, which immediately re-stamps the
// heartbeat so a live run is never stolen.

import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'
import { executeWorkflowRun, withRetry } from './run-workflow-graph'

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `worker-${process.pid}`
const STALE_AFTER_MS = parseInt(process.env['WORKER_WORKFLOW_STALE_AFTER_MS'] ?? '90000', 10)

interface ClaimedStaleRun {
  run_id: string
  workflow_id: string
  parent_run_id: string | null
  recursion_depth: number
  previous_status: string
}

interface RunExecContext {
  workflow_id: string
  context_inputs: Record<string, unknown>
  global_model_id: string | null
  ai_lenser_id: string | null
}

export async function recoverNextStaleWorkflow(signal?: AbortSignal): Promise<boolean> {
  const serviceClient = createServiceSupabaseClient()

  const { data, error } = await serviceClient.rpc('fn_claim_stale_workflow_run', {
    p_worker_id: WORKER_ID,
    p_stale_after_ms: STALE_AFTER_MS,
    p_max_claims: 1,
  })
  if (error) throw error

  const claimed = (Array.isArray(data) ? data[0] : data) as ClaimedStaleRun | undefined
  if (!claimed) return false

  const startedAt = Date.now()
  nodeLogger.warn('recovering stale workflow run', {
    runId: claimed.run_id,
    workflowId: claimed.workflow_id,
    previousStatus: claimed.previous_status,
  })

  const { data: ctxData, error: ctxErr } = await serviceClient.rpc('fn_worker_get_run_exec_context', {
    p_run_id: claimed.run_id,
  })
  if (ctxErr) {
    nodeLogger.error('recovery: could not load run exec context', { runId: claimed.run_id, message: ctxErr.message })
    await withRetry(async () => {
      await serviceClient.rpc('fn_worker_set_workflow_run_status', { p_run_id: claimed.run_id, p_status: 'failed' })
    }).catch(() => undefined)
    return true
  }
  const ctx = (Array.isArray(ctxData) ? ctxData[0] : ctxData) as RunExecContext | undefined

  let finalStatus: 'completed' | 'failed' = 'failed'
  try {
    finalStatus = await executeWorkflowRun(
      serviceClient,
      {
        runId: claimed.run_id,
        workflowId: claimed.workflow_id,
        contextInputs: ctx?.context_inputs ?? {},
        globalModelId: ctx?.global_model_id ?? null,
        aiLenserId: ctx?.ai_lenser_id ?? null,
      },
      { workerId: WORKER_ID, signal },
    )
  } catch (err) {
    nodeLogger.error('recovery: re-execution failed', {
      runId: claimed.run_id,
      message: err instanceof Error ? err.message : String(err),
    })
    finalStatus = 'failed'
  }

  await withRetry(async () => {
    await serviceClient.rpc('fn_worker_set_workflow_run_status', { p_run_id: claimed.run_id, p_status: finalStatus })
  }).catch((statusErr) => {
    nodeLogger.error('recovery: could not write final status', {
      runId: claimed.run_id,
      message: statusErr instanceof Error ? statusErr.message : String(statusErr),
    })
  })

  nodeLogger.info('stale workflow run recovered', {
    runId: claimed.run_id,
    status: finalStatus,
    durationMs: Date.now() - startedAt,
  })
  return true
}
