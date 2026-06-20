import { callProvider, callGenerativeMedia, modelKind } from '@lenserfight/providers'
import type { ProviderMessage, GenerativeMediaProvider } from '@lenserfight/providers'
import { byokKeyResolver } from '@lenserfight/providers'
import { nodeLogger } from '@lenserfight/utils/logger'
import { chainabitExecutionRepository } from '@lenserfight/data/repositories'
import { createServiceSupabaseClient } from '../lib/supabase'
import { PROVIDER_TIMEOUT_MS, withTimeout, timeoutSignal } from '../lib/timeout'

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

/** Map model kind → execution branch. Unknown models fall back to 'text'. */
function resolveExecutionKind(
  modelKey: string,
): 'text' | 'image' | 'audio' | 'video' | 'music' {
  return modelKind(modelKey) ?? 'text'
}

/** Map model output kind → output_modality value stored in battles.submissions. */
function kindToOutputModality(
  kind: 'text' | 'image' | 'audio' | 'video' | 'music',
): 'text' | 'image' | 'audio' | 'video' {
  if (kind === 'music') return 'audio'
  return kind
}

/** Map model output kind → generative media modality. */
function kindToGenerativeModality(
  kind: 'image' | 'audio' | 'video' | 'music',
): 'image' | 'audio' | 'video' | 'music' {
  return kind
}

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

/**
 * H4: resolve an ai_agent contender's system prompt. The personality note is a
 * lens template; render it with the task prompt available so any {{tokens}}
 * resolve, and fall back to the raw note when rendering errors or produces an
 * empty body (so the agent is never left without its persona).
 */
async function resolvePersonalityPrompt(
  serviceClient: ReturnType<typeof createServiceSupabaseClient>,
  job: ClaimedBattleJob,
  prompt: string,
): Promise<string | undefined> {
  if (job.personality_version_id) {
    const { data: rendered, error: renderErr } = await serviceClient
      .rpc('fn_worker_render_template', {
        p_template_body: job.personality_note ?? '',
        p_inputs: { prompt },
      })
    const body = !renderErr && rendered ? (rendered as string).trim() : ''
    if (body) return body
    return job.personality_note?.trim() || undefined
  }
  return job.personality_note?.trim() || undefined
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
  const execKind = resolveExecutionKind(job.model_key)

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

    if (execKind === 'text') {
      // ── Text execution path ────────────────────────────────────────────────

      // Build system prompt from agent personality (ai_agent contenders only).
      // H4: render with the task prompt as input so any {{tokens}} resolve, and
      // fall back to the raw personality note if rendering errors or yields an
      // empty body (previously rendered with {} → tokens vanished, sometimes
      // leaving the agent with no system prompt at all).
      const systemPrompt = await resolvePersonalityPrompt(serviceClient, job, prompt)

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
        undefined,
        timeoutSignal(),
      )

      await serviceClient
        .rpc('fn_worker_upsert_battle_submission', {
          p_battle_id:        job.battle_id,
          p_contender_id:     job.contender_id,
          p_content_text:     response.content,
          p_execution_run_id: null,
          p_artifact_id:      null,
          p_is_final:         true,
          p_output_modality:  'text',
        })
    } else {
      // ── Generative media execution path ───────────────────────────────────
      // Covers image (sync), audio (sync/async), video (async), music (async).

      const apiKey = await resolveApiKey(job)
      const modality = kindToGenerativeModality(execKind)
      const outputModality = kindToOutputModality(execKind)

      const mediaResponse = await withTimeout(
        callGenerativeMedia(
          job.provider_key as GenerativeMediaProvider | null,
          modality,
          apiKey,
          job.model_key,
          prompt,
        ),
        PROVIDER_TIMEOUT_MS,
        `media:${job.model_key}`,
      )

      if (mediaResponse.status === 'failed') {
        throw new Error(mediaResponse.message)
      }

      if (mediaResponse.status === 'completed') {
        // Sync result — store media URL immediately.
        const mediaUrl = mediaResponse.urls[0] ?? null
        await serviceClient
          .rpc('fn_worker_upsert_battle_submission', {
            p_battle_id:        job.battle_id,
            p_contender_id:     job.contender_id,
            p_content_text:     null,
            p_execution_run_id: null,
            p_artifact_id:      null,
            p_is_final:         true,
            p_media_url:        mediaUrl,
            p_mime_type:        mediaResponse.mimeType,
            p_output_modality:  outputModality,
          })
      } else {
        // Async result — store providerTaskId in artifact_id for the
        // poll-async-executions edge function to pick up and complete.
        // Status is 'pending' until the poll worker finalises it.
        await serviceClient
          .rpc('fn_worker_upsert_battle_submission', {
            p_battle_id:        job.battle_id,
            p_contender_id:     job.contender_id,
            p_content_text:     null,
            p_execution_run_id: null,
            p_artifact_id:      mediaResponse.providerTaskId,
            p_is_final:         false,
            p_output_modality:  outputModality,
          })
      }
    }

    await serviceClient
      .rpc('fn_worker_complete_battle_job', {
        p_job_id: job.job_id,
        p_status: 'completed',
      })

    nodeLogger.info('battle job completed', {
      jobId:     job.job_id,
      battleId:  job.battle_id,
      slot:      job.slot,
      execKind,
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
        execKind,
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
        execKind,
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

    const systemPrompt = await resolvePersonalityPrompt(serviceClient, job, prompt)

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
        p_battle_id:        job.battle_id,
        p_contender_id:     job.contender_id,
        p_content_text:     result.outputText ?? '',
        p_execution_run_id: null,
        p_artifact_id:      null,
        p_is_final:         true,
        p_output_modality:  'text',
      })

    await serviceClient
      .rpc('fn_worker_complete_battle_job', {
        p_job_id: job.job_id,
        p_status: 'completed',
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
