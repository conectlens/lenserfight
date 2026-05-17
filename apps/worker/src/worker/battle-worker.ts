import { callProvider } from '@lenserfight/providers'
import type { ProviderMessage } from '@lenserfight/providers'
import { byokKeyResolver } from '@lenserfight/providers'
import { nodeLogger } from '@lenserfight/utils/logger'
import { chainabitExecutionRepository } from '@lenserfight/data/repositories'
import { createServiceSupabaseClient } from '../lib/supabase'

const CHAINABIT_EXECUTION_ENABLED = process.env['CHAINABIT_EXECUTION_ENABLED'] === 'true'

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
  // personality fields — populated when contender_type = 'ai_agent'
  ai_lenser_id: string | null
  personality_note: string | null
  personality_version_id: string | null
}

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `battle-worker-${process.pid}`
const MAX_RETRIES = parseInt(process.env['BATTLE_WORKER_MAX_RETRIES'] ?? '3', 10)

async function resolveApiKey(job: ClaimedBattleJob): Promise<string> {
  if (job.provider_key === 'ollama') return ''

  if (job.byok_key_ref_id) {
    const serviceClient = createServiceSupabaseClient()
    const { data, error } = await serviceClient
      .rpc('fn_worker_decrypt_api_key', { p_key_id: job.byok_key_ref_id })
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
    .rpc('fn_worker_claim_battle_job', { p_worker_id: WORKER_ID })

  if (error) throw error

  const job = (Array.isArray(data) ? data[0] : data) as ClaimedBattleJob | undefined
  if (!job) return false

  // Delegate to Chainabit execution bridge when enabled
  if (CHAINABIT_EXECUTION_ENABLED) {
    return processNextBattleJobViaChainabit(serviceClient, job)
  }

  const startedAt = Date.now()

  try {
    let prompt = job.task_prompt

    // If a lens version is assigned, render the template with the task_prompt as input
    if (job.version_id) {
      const { data: rendered, error: renderErr } = await serviceClient
        .rpc('fn_worker_render_template', {
          p_template_body: job.task_prompt,
          p_inputs: { prompt: job.task_prompt },
        })
      if (renderErr || !rendered) {
        throw new Error(renderErr?.message ?? 'Failed to render lens template')
      }
      prompt = rendered as string
    }

    // Build system prompt from agent personality (ai_agent contenders only).
    // Personality lens template takes precedence over the plain personality_note.
    let systemPrompt: string | undefined
    if (job.personality_version_id) {
      const { data: rendered, error: renderErr } = await serviceClient
        .rpc('fn_worker_render_template', {
          p_template_body: job.personality_note ?? '',
          p_inputs: {},
        })
      if (!renderErr && rendered) {
        systemPrompt = rendered as string
      }
    } else if (job.personality_note) {
      systemPrompt = job.personality_note
    }

    const messages: ProviderMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ]

    const apiKey = await resolveApiKey(job)
    const response = await callProvider(
      job.provider_key as 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama',
      apiKey,
      job.model_key,
      messages,
    )

    await serviceClient
      .rpc('fn_worker_upsert_battle_submission', {
        p_battle_id:       job.battle_id,
        p_contender_id:    job.contender_id,
        p_content_text:    response.content,
        p_execution_run_id: null,
        p_artifact_id:     null,
        p_is_final:        true,
      })

    await serviceClient
      .rpc('fn_worker_complete_battle_job', {
        p_job_id:        job.job_id,
        p_status:        'completed',
        p_error_message: null,
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
      await serviceClient.rpc('fn_requeue_battle_job_with_backoff', {
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
      await serviceClient.rpc('fn_move_battle_job_to_dlq', {
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

async function processNextBattleJobViaChainabit(
  serviceClient: ReturnType<typeof createServiceSupabaseClient>,
  job: ClaimedBattleJob,
): Promise<boolean> {
  const startedAt = Date.now()
  try {
    const apiKey = await resolveApiKey(job)

    let prompt = job.task_prompt
    if (job.version_id) {
      const { data: rendered, error: renderErr } = await serviceClient
        .rpc('fn_worker_render_template', {
          p_template_body: job.task_prompt,
          p_inputs: { prompt: job.task_prompt },
        })
      if (renderErr || !rendered) {
        throw new Error(renderErr?.message ?? 'Failed to render lens template')
      }
      prompt = rendered as string
    }

    let systemPrompt: string | undefined
    if (job.personality_version_id) {
      const { data: rendered, error: renderErr } = await serviceClient
        .rpc('fn_worker_render_template', {
          p_template_body: job.personality_note ?? '',
          p_inputs: {},
        })
      if (!renderErr && rendered) systemPrompt = rendered as string
    } else if (job.personality_note) {
      systemPrompt = job.personality_note
    }

    const externalJobId = await chainabitExecutionRepository.submitBattleJob({
      jobId: job.job_id,
      battleId: job.battle_id,
      slot: job.slot,
      prompt,
      systemPrompt,
      providerKey: job.provider_key,
      modelKey: job.model_key,
      apiKey,
      maxTokens: job.max_tokens,
      temperature: job.temperature,
    })

    nodeLogger.info('chainabit_job_submitted', {
      jobId: job.job_id,
      externalJobId,
      battleId: job.battle_id,
      slot: job.slot,
    })

    // Poll until terminal
    const POLL_INTERVAL_MS = 2_000
    const TIMEOUT_MS = 300_000
    const deadline = Date.now() + TIMEOUT_MS
    let result = await chainabitExecutionRepository.pollBattleJob(externalJobId)
    while (result.status === 'pending' || result.status === 'running') {
      if (Date.now() > deadline) throw new Error('Chainabit job polling timed out')
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      result = await chainabitExecutionRepository.pollBattleJob(externalJobId)
    }

    if (result.status === 'failed') {
      throw new Error(result.errorMessage ?? 'Chainabit job failed')
    }

    await serviceClient
      .rpc('fn_worker_upsert_battle_submission', {
        p_battle_id:       job.battle_id,
        p_contender_id:    job.contender_id,
        p_content_text:    result.outputText ?? '',
        p_execution_run_id: null,
        p_artifact_id:     null,
        p_is_final:        true,
      })

    await serviceClient
      .rpc('fn_worker_complete_battle_job', {
        p_job_id:        job.job_id,
        p_status:        'completed',
        p_error_message: null,
      })

    nodeLogger.info('battle job completed via Chainabit', {
      jobId: job.job_id, battleId: job.battle_id, slot: job.slot,
      durationMs: Date.now() - startedAt, externalJobId,
    })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (job.retry_count < MAX_RETRIES - 1) {
      await serviceClient.rpc('fn_requeue_battle_job_with_backoff', {
        p_job_id: job.job_id, p_backoff_ms: backoffMs(job.retry_count), p_error: message,
      })
      nodeLogger.warn('Chainabit battle job failed — requeued', {
        jobId: job.job_id, retryCount: job.retry_count + 1, message,
      })
    } else {
      await serviceClient.rpc('fn_move_battle_job_to_dlq', {
        p_job_id: job.job_id, p_error_code: 'chainabit.max_retries_exceeded', p_error_msg: message,
      })
      nodeLogger.error('Chainabit battle job moved to DLQ', {
        jobId: job.job_id, battleId: job.battle_id, slot: job.slot, message,
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
