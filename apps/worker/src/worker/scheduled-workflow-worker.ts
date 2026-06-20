import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'
import { executeWorkflowRun, withRetry } from './run-workflow-graph'

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `worker-${process.pid}`

// fn_claim_scheduled_workflow_run returns exactly these columns. (Earlier
// revisions of this interface read funding_source/battle_id/contender_id/
// byok_key_id, which no claim function or workflow_runs column ever returned —
// that BYOK-battle path is dead because battles execute via battles.battle_jobs,
// not lenses.workflow_runs. The dead branch was removed; see H1.)
interface ClaimedScheduledRun {
  run_id: string
  workflow_id: string
  schedule_id: string | null
  triggered_by: string | null
  context_inputs: Record<string, unknown>
  global_model_id: string | null
  ai_lenser_id: string | null
}

export async function processNextScheduledWorkflow(signal?: AbortSignal): Promise<boolean> {
  const serviceClient = createServiceSupabaseClient()

  const { data: claimResult, error: claimError } = await serviceClient
    .rpc('fn_worker_claim_scheduled_workflow_run', { p_worker_id: WORKER_ID })

  if (claimError) throw claimError

  const claimed = (Array.isArray(claimResult) ? claimResult[0] : claimResult) as ClaimedScheduledRun | undefined
  if (!claimed) return false

  const { run_id, workflow_id } = claimed
  const startedAt = Date.now()

  let finalStatus: 'completed' | 'failed' = 'failed'
  try {
    finalStatus = await executeWorkflowRun(
      serviceClient,
      {
        runId: run_id,
        workflowId: workflow_id,
        contextInputs: claimed.context_inputs ?? {},
        globalModelId: claimed.global_model_id,
        aiLenserId: claimed.ai_lenser_id,
      },
      { workerId: WORKER_ID, signal },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    nodeLogger.error('scheduled workflow run failed', { runId: run_id, workflowId: workflow_id, message })
    finalStatus = 'failed'
  }

  await withRetry(async () => {
    await serviceClient.rpc('fn_worker_set_workflow_run_status', { p_run_id: run_id, p_status: finalStatus })
  }).catch((statusErr) => {
    nodeLogger.error('could not write final status for run', {
      runId: run_id,
      message: statusErr instanceof Error ? statusErr.message : String(statusErr),
    })
  })

  nodeLogger.info('scheduled workflow run finished', {
    runId: run_id,
    workflowId: workflow_id,
    status: finalStatus,
    durationMs: Date.now() - startedAt,
  })

  return true
}
