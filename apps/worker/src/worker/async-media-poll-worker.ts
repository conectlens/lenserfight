import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'
import { checkProviderStatus, type ProviderStatusResult } from '../lib/provider-status'

// Phase AM — async media poll worker.
//
// Each tick:
//   1. fn_poll_async_run claims a batch of due runs (SKIP LOCKED, bumps
//      last_polled_at). Returns up to 10 rows.
//   2. For each row, query the provider's status endpoint (Fal/Sora/Veo/
//      Kling — see lib/provider-status.ts) using provider_task_id.
//   3. On `completed` → call fn_async_run_idempotent_complete with the
//      provider URL. The RPC writes media.objects + execution.artifacts and
//      flips status='succeeded'.
//   4. On `failed` / `expired` → mark the run failed via UPDATE.
//   5. On `pending` → no-op; the next tick will re-poll after the stale
//      window elapses.
//
// Concurrency: every claim is FOR UPDATE SKIP LOCKED, so multiple workers
// can run in parallel. Idempotency: fn_async_run_idempotent_complete is a
// no-op when the run is already terminal, so retries are safe.

const WORKER_ID = process.env['ASYNC_POLL_WORKER_ID'] ?? `async-poll-${process.pid}`
const STALE_AFTER_SECONDS = Number.parseInt(process.env['ASYNC_POLL_STALE_AFTER_SECONDS'] ?? '30', 10)
const BATCH_LIMIT = Number.parseInt(process.env['ASYNC_POLL_BATCH_LIMIT'] ?? '10', 10)

interface PolledRun {
  run_id: string
  provider_task_id: string
  model_key: string | null
  provider_key: string | null
  output_modality: string | null
  started_at: string
}

export async function pollAsyncMediaBatch(): Promise<{ polled: number; completed: number; failed: number }> {
  const serviceClient = createServiceSupabaseClient()

  const { data, error } = await serviceClient.rpc('fn_poll_async_run', {
    p_stale_after_seconds: STALE_AFTER_SECONDS,
    p_limit:               BATCH_LIMIT,
  })

  if (error) {
    nodeLogger.error('async-poll-worker claim failed', { workerId: WORKER_ID, message: error.message })
    throw error
  }

  const rows = (Array.isArray(data) ? data : []) as PolledRun[]
  if (rows.length === 0) {
    return { polled: 0, completed: 0, failed: 0 }
  }

  let completed = 0
  let failed = 0

  await Promise.all(
    rows.map(async (row) => {
      try {
        const status = await checkProviderStatus({
          providerKey: row.provider_key,
          modelKey:    row.model_key,
          taskId:      row.provider_task_id,
          modality:    row.output_modality,
        })
        await applyStatus(serviceClient, row, status)
        if (status.state === 'completed') completed++
        else if (status.state === 'failed') failed++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        nodeLogger.error('async-poll-worker poll failed', {
          workerId: WORKER_ID,
          runId:    row.run_id,
          message,
        })
        // Don't fail the whole tick — the next pass will retry this row.
      }
    }),
  )

  nodeLogger.info('async-poll-worker tick complete', {
    workerId: WORKER_ID,
    polled:    rows.length,
    completed,
    failed,
  })

  return { polled: rows.length, completed, failed }
}

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>

async function applyStatus(
  client: ServiceClient,
  row: PolledRun,
  status: ProviderStatusResult,
): Promise<void> {
  if (status.state === 'pending') return  // re-poll next tick

  if (status.state === 'completed') {
    const { error } = await client.rpc('fn_async_run_idempotent_complete', {
      p_run_id:     row.run_id,
      p_media_url:  status.mediaUrl,
      p_mime_type:  status.mimeType,
      p_bytes:      status.bytes ?? null,
      p_width:      status.width ?? null,
      p_height:     status.height ?? null,
      p_duration_s: status.durationSeconds ?? null,
    })
    if (error) throw new Error(error.message)
    return
  }

  // state === 'failed'
  const { error } = await client.rpc('fn_worker_fail_execution_run', {
    p_run_id:      row.run_id,
    p_error_code:  status.errorCode ?? 'provider_failed',
    p_error_message: status.errorMessage ?? 'Provider reported failure',
  })
  if (error) throw new Error(error.message)
}

export const AsyncMediaPollWorker = {
  workerId: WORKER_ID,
  poll:     pollAsyncMediaBatch,
}
