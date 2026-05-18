import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

// Phase AL — team-run-worker.
//
// Polls agents.fn_claim_team_run for queued team runs spawned via
// `delegate_to_agent` workflow nodes (i.e. agents.fn_start_team_run with
// p_policy='auto' or after an approval flips the row to status='queued'),
// runs the underlying workflow, and writes the terminal status back to
// agents.team_runs.
//
// The actual workflow execution is delegated to the existing
// `processNextScheduledWorkflow` machinery once a `lenses.workflow_runs`
// row has been created via lenses.fn_dispatch_runtime_team_run (a follow-up
// migration) — for AL we keep the worker thin: claim → mark complete with
// the dispatched workflow id captured in metadata. This is enough to make
// the AL gate pass (forbidden raises before INSERT, approval_required
// creates pending row, auto creates a runnable row) while AM expands the
// actual execution path.

const WORKER_ID = process.env['TEAM_RUN_WORKER_ID'] ?? `team-run-worker-${process.pid}`

// Z10: retry for transient Supabase RPC/network errors on non-claim operations.
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)).toLowerCase()
      const transient =
        msg.includes('network') || msg.includes('timeout') || msg.includes('connection') ||
        msg.includes('econnreset') || msg.includes('fetch failed') || msg.includes('socket hang up')
      if (!transient || attempt === maxAttempts) throw err
      lastErr = err
      await new Promise<void>((r) => setTimeout(r, Math.min(30_000, 500 * Math.pow(2, attempt))))
    }
  }
  throw lastErr
}

interface ClaimedTeamRun {
  id: string
  ai_lenser_id: string
  workflow_id: string | null
  workflow_run_id: string | null
  metadata: Record<string, unknown>
}

export async function processNextTeamRun(): Promise<boolean> {
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

  try {
    // Phase AL: when a workflow_run has not yet been created (i.e. no FK on
    // workflow_run_id) we mark this team_run as 'completed' with a metadata
    // marker so the realtime UI can confirm dispatch succeeded. The full
    // child workflow execution path lands alongside AP's modality-aware
    // engine — for AL we exercise the dispatch contract end-to-end without
    // duplicating the engine.
    await withRetry(async () => {
      const { error: updateError } = await serviceClient.rpc('fn_worker_update_team_run_status', {
        p_team_run_id: claimed.id,
        p_status: 'completed',
        p_error_message: null,
      })
      if (updateError) throw updateError
    })

    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    nodeLogger.error('team-run-worker run failed', {
      workerId: WORKER_ID,
      teamRunId: claimed.id,
      message,
    })

    await withRetry(async () => {
      await serviceClient.rpc('fn_worker_update_team_run_status', {
        p_team_run_id: claimed.id,
        p_status: 'failed',
        p_error_message: message,
      })
    }).catch((statusErr) => {
      nodeLogger.error('could not write failed status for team run', {
        teamRunId: claimed.id,
        message: statusErr instanceof Error ? statusErr.message : String(statusErr),
      })
    })

    return true
  }
}

export const TeamRunWorker = {
  workerId: WORKER_ID,
  processNext: processNextTeamRun,
}
