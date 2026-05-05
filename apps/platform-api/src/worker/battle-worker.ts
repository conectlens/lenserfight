import { callProvider } from '@lenserfight/providers'
import { byokKeyResolver } from '@lenserfight/providers'
import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

interface ClaimedBattleJob {
  job_id: string
  battle_id: string
  contender_id: string
  slot: 'A' | 'B'
  task_prompt: string
  provider_key: string
  model_key: string
  byok_key_ref_id: string | null
  lens_id: string | null
  version_id: string | null
  max_tokens: number
  temperature: number
  retry_count: number
}

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `battle-worker-${process.pid}`
const MAX_RETRIES = parseInt(process.env['BATTLE_WORKER_MAX_RETRIES'] ?? '3', 10)

async function resolveApiKey(job: ClaimedBattleJob): Promise<string> {
  if (job.provider_key === 'ollama') return ''

  if (job.byok_key_ref_id) {
    const serviceClient = createServiceSupabaseClient()
    const { data, error } = await serviceClient
      .schema('ai')
      .rpc('fn_decrypt_api_key', { p_key_id: job.byok_key_ref_id })
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to decrypt BYOK key')
    }
    return data as string
  }

  return byokKeyResolver.resolve(job.provider_key)
}

function backoffMs(retryCount: number): number {
  return Math.min(30_000, 500 * Math.pow(2, retryCount))
}

export async function processNextBattleJob(): Promise<boolean> {
  const serviceClient = createServiceSupabaseClient()

  const { data, error } = await serviceClient
    .schema('battles')
    .rpc('fn_claim_battle_execution_job', { p_worker_id: WORKER_ID })

  if (error) throw error

  const job = (Array.isArray(data) ? data[0] : data) as ClaimedBattleJob | undefined
  if (!job) return false

  const startedAt = Date.now()

  try {
    let prompt = job.task_prompt

    // If a lens version is assigned, render the template with the task_prompt as input
    if (job.version_id) {
      const { data: rendered, error: renderErr } = await serviceClient
        .schema('lenses')
        .rpc('fn_render_template', {
          p_version_id: job.version_id,
          p_inputs: { prompt: job.task_prompt },
        })
      if (renderErr || !rendered) {
        throw new Error(renderErr?.message ?? 'Failed to render lens template')
      }
      prompt = rendered as string
    }

    const apiKey = await resolveApiKey(job)
    const response = await callProvider(
      job.provider_key as 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama',
      apiKey,
      job.model_key,
      [{ role: 'user', content: prompt }],
    )

    await serviceClient
      .schema('battles')
      .rpc('fn_complete_battle_execution_job', {
        p_job_id:      job.job_id,
        p_status:      'completed',
        p_output_text: response.content,
        p_error:       null,
      })

    nodeLogger.info('battle job completed', {
      jobId:     job.job_id,
      battleId:  job.battle_id,
      slot:      job.slot,
      durationMs: Date.now() - startedAt,
      provider:  job.provider_key,
      model:     job.model_key,
    })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (job.retry_count < MAX_RETRIES - 1) {
      await serviceClient.schema('battles').rpc('fn_requeue_battle_job_with_backoff', {
        p_job_id:     job.job_id,
        p_backoff_ms: backoffMs(job.retry_count),
        p_error:      message,
      })
      nodeLogger.warn('battle job failed — requeued with backoff', {
        jobId:      job.job_id,
        retryCount: job.retry_count + 1,
        backoffMs:  backoffMs(job.retry_count),
        message,
      })
    } else {
      // Max retries exceeded — move to dead-letter queue
      await serviceClient.schema('battles').rpc('fn_move_battle_job_to_dlq', {
        p_job_id:     job.job_id,
        p_error_code: 'execute.max_retries_exceeded',
        p_error_msg:  message,
      })
      nodeLogger.error('battle job moved to DLQ', {
        jobId:    job.job_id,
        battleId: job.battle_id,
        slot:     job.slot,
        message,
      })
    }
    return true
  }
}

export async function runBattleLoop(intervalMs: number, once: boolean): Promise<void> {
  do {
    const processed = await processNextBattleJob()
    if (!processed && once) break
    if (once) break
    if (!processed) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  } while (true)
}
