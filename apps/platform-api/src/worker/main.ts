import { callProvider } from '@lenserfight/providers'
import { byokKeyResolver } from '@lenserfight/providers'
import { nodeLogger } from '@lenserfight/utils/logger'
import { PLATFORM_API_WORKER_INTERVAL_MS, PLATFORM_API_WORKER_ONCE } from '@lenserfight/utils/env'
import { createServiceSupabaseClient } from '../lib/supabase'
import { processNextBattleJob } from './battle-worker'
import { processNextScheduledWorkflow } from './scheduled-workflow-worker'

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `worker-${process.pid}`
const HEARTBEAT_INTERVAL_MS = parseInt(process.env['WORKER_HEARTBEAT_INTERVAL_MS'] ?? '10000', 10)

async function emitHeartbeat(): Promise<void> {
  if (process.env['FEATURE_WORKER_HEALTH_MONITORING'] !== 'true') return
  try {
    const serviceClient = createServiceSupabaseClient()
    await serviceClient.schema('platform').rpc('fn_upsert_worker_heartbeat', {
      p_worker_id:   WORKER_ID,
      p_worker_type: 'combined',
      p_metadata:    { pid: process.pid, uptime: process.uptime() },
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
      .schema('ai')
      .rpc('fn_decrypt_api_key', { p_key_id: claimedRun.byok_key_ref_id })
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
  const { data, error } = await serviceClient.schema('execution').rpc('fn_claim_queued_run')
  if (error) throw error

  const claimedRun = (Array.isArray(data) ? data[0] : data) as ClaimedRun | undefined
  if (!claimedRun) return false

  const startedAt = Date.now()

  try {
    if (!claimedRun.version_id) {
      throw new Error('Claimed run has no version_id')
    }

    const { data: renderedPrompt, error: renderError } = await serviceClient
      .schema('lenses')
      .rpc('fn_render_template', {
        p_version_id: claimedRun.version_id,
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
    )

    const latencyMs = Date.now() - startedAt

    await serviceClient.schema('execution').rpc('fn_complete_execution_run', {
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

    await serviceClient.schema('execution').rpc('fn_persist_execution_artifacts', {
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
    await serviceClient.schema('execution').rpc('fn_complete_execution_run', {
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

async function runLoop(): Promise<void> {
  const intervalMs = PLATFORM_API_WORKER_INTERVAL_MS()
  const once = PLATFORM_API_WORKER_ONCE()
  const battleWorkerEnabled = process.env['PLATFORM_API_BATTLE_WORKER_ENABLED'] === 'true'
  const scheduledWorkflowWorkerEnabled = process.env['PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED'] === 'true'

  // Start heartbeat timer (independent of main loop)
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  if (!once) {
    heartbeatTimer = setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS)
    await emitHeartbeat()
  }

  do {
    const results = await Promise.allSettled([
      processNextQueuedRun(),
      battleWorkerEnabled ? processNextBattleJob() : Promise.resolve(false),
      scheduledWorkflowWorkerEnabled ? processNextScheduledWorkflow() : Promise.resolve(false),
    ])

    const processed = results.some((r) => r.status === 'fulfilled' && r.value === true)

    for (const r of results) {
      if (r.status === 'rejected') {
        nodeLogger.error('worker tick error', { message: String(r.reason) })
      }
    }

    if (!processed && once) break
    if (once) break
    if (!processed) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  } while (true)

  if (heartbeatTimer) clearInterval(heartbeatTimer)
}

runLoop().catch((error) => {
  nodeLogger.error('worker loop crashed', {
    message: error instanceof Error ? error.message : String(error),
  })
  process.exitCode = 1
})
