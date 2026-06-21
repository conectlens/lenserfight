import http from 'node:http'
import { callProvider } from '@lenserfight/providers'
import { byokKeyResolver } from '@lenserfight/providers'
import { nodeLogger } from '@lenserfight/utils/logger'
import { PLATFORM_API_WORKER_INTERVAL_MS, PLATFORM_API_WORKER_ONCE } from '@lenserfight/utils/env'
import { createServiceSupabaseClient } from '../lib/supabase'
import { timeoutSignal } from '../lib/timeout'
import { processNextBattleJob } from './battle-worker'
import { processNextScheduledWorkflow } from './scheduled-workflow-worker'
import { processNextTeamRun } from './team-run-worker'
import { recoverNextStaleWorkflow } from './workflow-recovery-worker'
import { startVoteAnomalyWorker } from './vote-anomaly-worker'
import { startBattleAutoPromoteWorker } from './battle-auto-promote-worker'
import { startBattleFinalizeWorker } from './battle-finalize-worker'
import { startWebhookDrainWorker } from './webhook-drain-worker'
import { startWorkflowEventDispatcher } from './workflow-event-dispatcher'
import { pollAsyncMediaBatch } from './async-media-poll-worker'

let _workerReady = false

const HEALTH_PORT = parseInt(process.env['WORKER_HEALTH_PORT'] ?? '9090', 10)
const HEALTH_TOKEN = process.env['WORKER_HEALTH_TOKEN']
const _healthServer = http.createServer(async (req, res) => {
  if (HEALTH_TOKEN && req.headers.authorization !== 'Bearer ' + HEALTH_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'unauthorized' }))
  }
  if (req.url === '/ready') {
    res.writeHead(_workerReady ? 200 : 503, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ready: _workerReady }))
  }
  if (req.url === '/health') {
    // M5: /health touches the DB — require the health token even when other
    // routes are open, so an unauthenticated caller cannot probe internals.
    if (!HEALTH_TOKEN) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'health endpoint requires WORKER_HEALTH_TOKEN' }))
    }
    try {
      const { data } = await createServiceSupabaseClient().rpc('fn_admin_health')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ status: 'ok', health: data }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ status: 'error', error: String(e) }))
    }
  }
  res.writeHead(404); res.end()
})
_healthServer.listen(HEALTH_PORT, () => nodeLogger.info({ port: HEALTH_PORT }, 'health server ready'))

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `worker-${process.pid}`
const HEARTBEAT_INTERVAL_MS = parseInt(process.env['WORKER_HEARTBEAT_INTERVAL_MS'] ?? '10000', 10)

async function emitHeartbeat(): Promise<void> {
  if (process.env['FEATURE_WORKER_HEALTH_MONITORING'] !== 'true') return
  try {
    const serviceClient = createServiceSupabaseClient()
    await serviceClient.rpc('fn_worker_upsert_heartbeat', {
      p_worker_id:    WORKER_ID,
      p_worker_type:  'combined',
      p_capabilities: [],
    })
  } catch {
    // Heartbeat failure must not crash the worker
  }
}

interface ClaimedRun {
  run_id: string
  request_id: string
  requester_lenser_id: string
  workspace_id: string | null
  lens_id: string
  version_id: string | null
  model_id: string
  model_key: string
  provider_key: string
  funding_source: string
  byok_key_ref_id: string | null
  input_snapshot: Record<string, unknown>
}

async function resolveApiKey(claimedRun: ClaimedRun): Promise<string> {
  if (claimedRun.provider_key === 'ollama') return ''

  if (claimedRun.funding_source === 'user_byok_cloud') {
    if (!claimedRun.byok_key_ref_id) {
      throw new Error('Queued BYOK run is missing byok_key_ref_id')
    }
    const serviceClient = createServiceSupabaseClient()
    const { data, error } = await serviceClient
      .rpc('fn_worker_decrypt_api_key', { p_key_id: claimedRun.byok_key_ref_id })
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to decrypt BYOK key')
    }
    return data as string
  }

  if (claimedRun.funding_source === 'user_byok_local') {
    throw new Error('Local BYOK runs are not supported by the cloud worker')
  }

  return byokKeyResolver.resolve(claimedRun.provider_key)
}

export async function processNextQueuedRun(): Promise<boolean> {
  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('fn_worker_claim_queued_run')
  if (error) throw error

  const claimedRun = (Array.isArray(data) ? data[0] : (data ? data : undefined)) as ClaimedRun | undefined
  if (!claimedRun) return false

  const startedAt = Date.now()

  try {
    if (!claimedRun.version_id) {
      throw new Error('Claimed run has no version_id')
    }

    const { data: renderedPrompt, error: renderError } = await serviceClient
      .rpc('fn_worker_render_template', {
        p_template_body: String(claimedRun.input_snapshot?.['prompt'] ?? ''),
        p_inputs: claimedRun.input_snapshot,
      })

    if (renderError || !renderedPrompt) {
      throw new Error(renderError?.message ?? 'Failed to render lens template')
    }

    const apiKey = await resolveApiKey(claimedRun)
    const providerResponse = await callProvider(
      claimedRun.provider_key as 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama',
      apiKey,
      claimedRun.model_key,
      [{ role: 'user', content: renderedPrompt as string }],
      undefined,
      timeoutSignal(),
    )

    const latencyMs = Date.now() - startedAt

    await serviceClient.rpc('fn_worker_complete_execution_run', {
      p_run_id: claimedRun.run_id,
      p_status: 'succeeded',
      p_token_input: providerResponse.usage?.input_tokens ?? 0,
      p_token_output: providerResponse.usage?.output_tokens ?? 0,
      p_credit_cost: 0,
      p_billing_status: 'free',
      p_response_text: providerResponse.content,
      p_response_meta: {
        provider: claimedRun.provider_key,
        model: claimedRun.model_key,
      },
      p_error_code: null,
      p_error_message: null,
      p_latency_ms: latencyMs,
    })

    await serviceClient.rpc('fn_worker_persist_execution_artifacts', {
      p_run_id: claimedRun.run_id,
      p_lenser_id: claimedRun.requester_lenser_id,
      p_workspace_id: claimedRun.workspace_id,
      p_ai_model_id: claimedRun.model_id,
      p_kind: 'text',
      p_content_text: providerResponse.content,
      p_content_json: null,
      p_media_ids: [],
    })

    nodeLogger.info('processed queued run', {
      runId: claimedRun.run_id,
      requestId: claimedRun.request_id,
      durationMs: latencyMs,
      provider: claimedRun.provider_key,
      model: claimedRun.model_key,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await serviceClient.rpc('fn_worker_complete_execution_run', {
      p_run_id: claimedRun.run_id,
      p_status: 'failed',
      p_error_code: 'execute.provider_failed',
      p_error_message: message,
      p_latency_ms: Date.now() - startedAt,
    })

    nodeLogger.error('failed queued run', {
      runId: claimedRun.run_id,
      requestId: claimedRun.request_id,
      message,
    })
    return true
  }
}

/**
 * C2: each job type runs its own independent poll loop so a slow job type
 * (a long workflow run, a stuck provider call) cannot block the others. Each
 * loop processes one item, then immediately re-polls when it found work, or
 * backs off by `intervalMs` (+ jitter) when the queue was empty. Stops when the
 * shutdown signal aborts.
 */
function startPollLoop(
  name: string,
  processFn: (signal: AbortSignal) => Promise<boolean>,
  intervalMs: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let stopped = false
    const stop = () => { if (!stopped) { stopped = true; resolve() } }
    signal.addEventListener('abort', stop, { once: true })

    const tick = async () => {
      if (stopped || signal.aborted) return stop()
      let processed = false
      try {
        processed = await processFn(signal)
      } catch (err) {
        nodeLogger.error(`${name}: tick error`, { message: err instanceof Error ? err.message : String(err) })
      }
      if (stopped || signal.aborted) return stop()
      const delay = processed ? 0 : intervalMs + Math.floor(Math.random() * 500)
      setTimeout(() => { void tick() }, delay)
    }
    void tick()
  })
}

async function runLoop(): Promise<void> {
  const intervalMs = PLATFORM_API_WORKER_INTERVAL_MS()
  const once = PLATFORM_API_WORKER_ONCE()
  const battleWorkerEnabled = process.env['PLATFORM_API_BATTLE_WORKER_ENABLED'] === 'true'
  const scheduledWorkflowWorkerEnabled = process.env['PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED'] === 'true'
  const teamRunWorkerEnabled = process.env['PLATFORM_API_TEAM_RUN_WORKER_ENABLED'] === 'true'
  const workflowRecoveryEnabled = process.env['PLATFORM_API_WORKFLOW_RECOVERY_ENABLED'] !== 'false'

  // ── once mode: run each enabled processor a single time and return ──────────
  if (once) {
    const results = await Promise.allSettled([
      processNextQueuedRun(),
      battleWorkerEnabled ? processNextBattleJob() : Promise.resolve(false),
      scheduledWorkflowWorkerEnabled ? processNextScheduledWorkflow() : Promise.resolve(false),
      teamRunWorkerEnabled ? processNextTeamRun() : Promise.resolve(false),
    ])
    for (const r of results) {
      if (r.status === 'rejected') nodeLogger.error('worker once tick error', { message: String(r.reason) })
    }
    _healthServer.close()
    return
  }

  // ── long-running mode: independent loops + background pollers ───────────────
  const shutdown = new AbortController()

  const stoppers: Array<() => void> = []
  const register = (enabled: boolean, start: () => (() => void) | void) => {
    if (!enabled) return
    const stop = start()
    if (stop) stoppers.push(stop)
  }

  register(process.env['PLATFORM_API_VOTE_ANOMALY_WORKER_ENABLED'] !== 'false', startVoteAnomalyWorker)
  register(process.env['PLATFORM_API_AUTO_PROMOTE_WORKER_ENABLED'] !== 'false', startBattleAutoPromoteWorker)
  register(process.env['PLATFORM_API_BATTLE_FINALIZE_WORKER_ENABLED'] !== 'false', startBattleFinalizeWorker)
  register(process.env['PLATFORM_API_WEBHOOK_DRAIN_ENABLED'] !== 'false', startWebhookDrainWorker)
  register(process.env['PLATFORM_API_WORKFLOW_DISPATCH_ENABLED'] !== 'false', startWorkflowEventDispatcher)

  // Async media poller (interval based)
  if (process.env['PLATFORM_API_ASYNC_MEDIA_POLL_ENABLED'] !== 'false') {
    const ASYNC_MEDIA_POLL_INTERVAL_MS = parseInt(process.env['ASYNC_MEDIA_POLL_INTERVAL_MS'] ?? '15000', 10)
    const asyncMediaPollTick = async () => {
      try { await pollAsyncMediaBatch() } catch (err) {
        nodeLogger.error('async-media-poll-worker: cycle error', { message: err instanceof Error ? err.message : String(err) })
      }
    }
    void asyncMediaPollTick()
    const timer = setInterval(() => { void asyncMediaPollTick() }, ASYNC_MEDIA_POLL_INTERVAL_MS)
    nodeLogger.info('async-media-poll-worker: started', { intervalMs: ASYNC_MEDIA_POLL_INTERVAL_MS })
    stoppers.push(() => clearInterval(timer))
  }

  // Worker-level heartbeat (independent of the job loops)
  const heartbeatTimer = setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS)
  await emitHeartbeat()
  stoppers.push(() => clearInterval(heartbeatTimer))

  _workerReady = true

  // Independent per-job-type loops. recoverNextStaleWorkflow runs at a relaxed
  // cadence (it only acts on genuinely stale runs).
  const loops: Array<Promise<void>> = [
    startPollLoop('queued-run', () => processNextQueuedRun(), intervalMs, shutdown.signal),
  ]
  if (battleWorkerEnabled) loops.push(startPollLoop('battle', () => processNextBattleJob(), intervalMs, shutdown.signal))
  if (scheduledWorkflowWorkerEnabled) loops.push(startPollLoop('scheduled-workflow', (s) => processNextScheduledWorkflow(s), intervalMs, shutdown.signal))
  if (teamRunWorkerEnabled) loops.push(startPollLoop('team-run', (s) => processNextTeamRun(s), intervalMs, shutdown.signal))
  if (workflowRecoveryEnabled) loops.push(startPollLoop('workflow-recovery', (s) => recoverNextStaleWorkflow(s), Math.max(intervalMs, 30_000), shutdown.signal))

  // C4: graceful drain. On SIGTERM/SIGINT, stop accepting work, let in-flight
  // ticks settle, then exit cleanly.
  const onSignal = (sig: string) => {
    nodeLogger.info('worker received shutdown signal', { signal: sig })
    _workerReady = false
    shutdown.abort()
  }
  process.once('SIGTERM', () => onSignal('SIGTERM'))
  process.once('SIGINT', () => onSignal('SIGINT'))

  await Promise.all(loops)

  // Cleanup
  _workerReady = false
  for (const stop of stoppers) {
    try { stop() } catch { /* ignore */ }
  }
  _healthServer.close()
  nodeLogger.info('worker drained — exiting')
}

runLoop()
  .then(() => {
    // Normal completion (once mode or graceful drain).
    process.exit(0)
  })
  .catch((error) => {
    // C4: a crashed main loop must NOT leave a zombie process that still
    // heartbeats and reports ready. Reset readiness and exit non-zero so the
    // orchestrator restarts the pod.
    _workerReady = false
    nodeLogger.error('worker loop crashed', {
      message: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  })
