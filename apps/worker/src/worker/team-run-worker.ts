// team-run-worker (C3).
//
// Claims queued agent team runs (agents.fn_start_team_run with policy='auto',
// or rows flipped to 'queued' after an approval) and ACTUALLY EXECUTES the
// agent's workflow. Previously this was a Phase-AL stub that marked every run
// 'completed' without running anything — agents reported success while doing
// no work. Execution now flows through the shared workflow executor:
//
//   claim team_run → create linked workflow_run (fn_worker_create_team_run_workflow_run)
//   → executeWorkflowRun (heartbeated, timed-out) → write back terminal status.

import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'
import { executeWorkflowRun, withRetry } from './run-workflow-graph'

const WORKER_ID = process.env['TEAM_RUN_WORKER_ID'] ?? `team-run-worker-${process.pid}`

interface ClaimedTeamRun {
  id: string
  ai_lenser_id: string
  workflow_id: string | null
  workflow_run_id: string | null
  metadata: Record<string, unknown>
}

interface TeamRunDispatch {
  run_id: string
  workflow_id: string
  context_inputs: Record<string, unknown>
  global_model_id: string | null
  ai_lenser_id: string | null
}

async function updateTeamRunStatus(
  serviceClient: ReturnType<typeof createServiceSupabaseClient>,
  teamRunId: string,
  status: 'completed' | 'failed',
  errorMessage: string | null,
): Promise<void> {
  await withRetry(async () => {
    const { error } = await serviceClient.rpc('fn_worker_finalize_team_run', {
      p_team_run_id: teamRunId,
      p_status: status,
      p_error_message: errorMessage,
    })
    if (error) throw error
  }).catch((statusErr) => {
    nodeLogger.error('could not write team run status', {
      teamRunId,
      status,
      message: statusErr instanceof Error ? statusErr.message : String(statusErr),
    })
  })
}

export async function processNextTeamRun(signal?: AbortSignal): Promise<boolean> {
  const serviceClient = createServiceSupabaseClient()

  const { data, error } = await serviceClient.rpc('fn_worker_claim_team_run')
  if (error) {
    nodeLogger.error('team-run-worker claim failed', { workerId: WORKER_ID, message: error.message })
    throw error
  }

  const claimed = (Array.isArray(data) ? data[0] : data) as ClaimedTeamRun | undefined
  if (!claimed) return false

  const startedAt = Date.now()
  nodeLogger.info('team-run-worker claimed', {
    workerId: WORKER_ID,
    teamRunId: claimed.id,
    aiLenserId: claimed.ai_lenser_id,
    workflowId: claimed.workflow_id,
  })

  // A team run with no workflow has nothing to execute — treat as a successful
  // no-op so the row reaches a terminal state instead of looping.
  if (!claimed.workflow_id) {
    nodeLogger.warn('team run has no workflow_id — marking completed (no-op)', { teamRunId: claimed.id })
    await updateTeamRunStatus(serviceClient, claimed.id, 'completed', null)
    return true
  }

  // Create (or reuse) the linked workflow_run. The RPC inserts a workflow_runs
  // row, links team_runs.workflow_run_id, stamps run_worker_id + heartbeat_at,
  // and returns the execution context.
  let dispatch: TeamRunDispatch | undefined
  try {
    const { data: dispatchData, error: dispatchError } = await serviceClient.rpc(
      'fn_worker_create_team_run_workflow_run',
      { p_team_run_id: claimed.id, p_worker_id: WORKER_ID },
    )
    if (dispatchError) throw dispatchError
    dispatch = (Array.isArray(dispatchData) ? dispatchData[0] : dispatchData) as TeamRunDispatch | undefined
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    nodeLogger.error('team-run-worker dispatch creation failed', { teamRunId: claimed.id, message })
    await updateTeamRunStatus(serviceClient, claimed.id, 'failed', message)
    return true
  }

  if (!dispatch?.run_id) {
    const message = 'fn_worker_create_team_run_workflow_run returned no run'
    nodeLogger.error(message, { teamRunId: claimed.id })
    await updateTeamRunStatus(serviceClient, claimed.id, 'failed', message)
    return true
  }

  let finalStatus: 'completed' | 'failed' = 'failed'
  let runError: string | null = null
  try {
    finalStatus = await executeWorkflowRun(
      serviceClient,
      {
        runId: dispatch.run_id,
        workflowId: dispatch.workflow_id,
        contextInputs: dispatch.context_inputs ?? {},
        globalModelId: dispatch.global_model_id,
        aiLenserId: dispatch.ai_lenser_id ?? claimed.ai_lenser_id,
      },
      { workerId: WORKER_ID, signal },
    )
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err)
    nodeLogger.error('team-run-worker execution failed', { teamRunId: claimed.id, runId: dispatch.run_id, message: runError })
    finalStatus = 'failed'
  }

  // Write the child workflow_run terminal status, then the team_run status.
  await withRetry(async () => {
    await serviceClient.rpc('fn_worker_set_workflow_run_status', { p_run_id: dispatch!.run_id, p_status: finalStatus })
  }).catch(() => undefined)

  await updateTeamRunStatus(serviceClient, claimed.id, finalStatus, finalStatus === 'failed' ? runError : null)

  nodeLogger.info('team-run-worker finished', {
    workerId: WORKER_ID,
    teamRunId: claimed.id,
    runId: dispatch.run_id,
    status: finalStatus,
    durationMs: Date.now() - startedAt,
  })
  return true
}

export const TeamRunWorker = {
  workerId: WORKER_ID,
  processNext: processNextTeamRun,
}
