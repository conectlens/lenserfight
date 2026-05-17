// @ts-nocheck
// trigger-execution — Supabase Edge Function (Deno runtime)
//
// Handles generative media (image / video / audio / music) execution.
// Three funding paths mirror execute-stream exactly:
//
//   user_byok_cloud  → decrypt vault key via fn_worker_get_ai_key_secret → call provider directly
//   user_byok_local  → keys are browser-only; this path must not reach the edge function
//   platform_credit  → resolve Chainabit developer token from partner_provisions → Chainabit API
//
// No platform-owned provider API keys exist. Everything is BYOK or Chainabit.
//
// Environment variables required:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   CHAINABIT_API_URL (default: https://api.chainabit.com)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, errResponse, jsonResponse } from '../_shared/cors.ts'
import { buildOpenAIImageBody } from '../_shared/providers/openai-image-profiles.ts'
import { detectProvider as detectProviderFromRegistry, resolveWireModel } from '../_shared/providers/model-registry.ts'

declare const Deno: { env: { get(key: string): string | undefined } }

// ─── Types ────────────────────────────────────────────────────────────────────

type FundingSource = 'user_byok_cloud' | 'platform_credit' | 'user_byok_local'

interface TriggerExecutionBody {
  lens_id?: string
  version_id?: string
  model_id: string
  input_snapshot: Record<string, unknown>
  funding_source: FundingSource
  origin_type?: string
  byok_key_ref_id?: string
  generative_media_params?: {
    output_modality: 'image' | 'video' | 'audio' | 'music'
    prompt?: string
    width?: number
    height?: number
    aspect_ratio?: string
    duration_s?: number
    n?: number
    quality?: string
    style?: string
    voice_id?: string
    format?: string
    negative_prompt?: string
  }
}

interface MediaResult {
  url: string
  mimeType: string
  width?: number
  height?: number
  durationSeconds?: number
}

interface AsyncJobResult {
  taskId: string
  providerKey: string
}

// ─── Key / token resolution ───────────────────────────────────────────────────

async function resolveVaultKey(
  keyRefId: string,
  userId: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<string> {
  // SECURITY: passes the authenticated caller's auth.uid() so the SQL function
  // can verify ai.keys.lenser_id ownership before reading vault.decrypted_secrets.
  // Without this binding, any authenticated user could decrypt any other user's
  // stored BYOK key by supplying its UUID.
  const { data, error } = await serviceClient.rpc('fn_worker_get_ai_key_secret', {
    p_ai_key_id: keyRefId,
    p_user_id: userId,
  })
  if (error || !data || typeof data !== 'string') {
    throw new Error('Failed to decrypt BYOK key from vault')
  }
  return data as string
}

async function resolveChainabitToken(
  userId: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await serviceClient
    .from('partner_provisions')
    .select('token')
    .eq('user_id', userId)
    .eq('partner_name', 'chainabit')
    .maybeSingle()
  if (error) throw new Error('Failed to look up Chainabit account')
  if (!data?.token) throw new Error('No Chainabit account connected. Connect your Chainabit account to use platform credits for media generation.')
  return data.token as string
}

// ─── Provider detection ───────────────────────────────────────────────────────

// Provider routing now delegates to the shared model-registry (replaces the
// brittle `startsWith('dall-e')` ladder we used to carry inline). Falls back
// to 'openai' when the model is unknown so unregistered keys still attempt
// the OpenAI-compatible path rather than crashing.
function detectProvider(modelKey: string): string {
  return detectProviderFromRegistry(modelKey) ?? 'openai'
}

// ─── Chainabit-routed media (OpenAI-compatible models via Chainabit) ──────────

const CHAINABIT_SUPPORTED_IMAGE_PROVIDERS = new Set(['openai', 'google'])
const CHAINABIT_SUPPORTED_VIDEO_PROVIDERS = new Set(['openai'])

async function generateChainabitImage(
  chainabitToken: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<MediaResult> {
  const chainabitApiUrl = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
  const url = `${chainabitApiUrl.replace(/\/$/, '')}/api/v1/ai/images/generations`

  // Chainabit's image endpoint is OpenAI-compatible — same per-model param rules apply.
  const built = buildOpenAIImageBody(model, prompt, params)
  if ('error' in built) throw new Error(built.error)
  const { wireBody, profile } = built

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chainabitToken}` },
    body: JSON.stringify(wireBody),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Chainabit image error ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json() as { data: Array<{ url?: string; b64_json?: string }> }
  const item = data.data?.[0]
  const imgUrl = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
  if (!imgUrl) throw new Error('Chainabit returned no image data')
  const [w, h] = (wireBody.size as string).includes('x')
    ? (wireBody.size as string).split('x').map(Number)
    : [params?.width, params?.height]
  void profile
  return { url: imgUrl, mimeType: 'image/png', width: w, height: h }
}

// ─── Direct provider calls (user_byok_cloud) ─────────────────────────────────

async function generateOpenAIImage(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<MediaResult> {
  const built = buildOpenAIImageBody(model, prompt, params)
  if ('error' in built) throw new Error(built.error)
  const { wireBody } = built

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(wireBody),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI image error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { data: Array<{ url?: string; b64_json?: string }> }
  const item = data.data?.[0]
  // gpt-image-1 always returns b64_json regardless of response_format request,
  // so accept either shape and surface a data URL when only base64 is present.
  const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
  if (!url) throw new Error('OpenAI returned no image data')
  const [w, h] = (wireBody.size as string).includes('x')
    ? (wireBody.size as string).split('x').map(Number)
    : [params?.width, params?.height]
  return { url, mimeType: 'image/png', width: w, height: h }
}

async function generateFALImage(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<MediaResult> {
  const modelPath = model.startsWith('fal-ai/') ? model : `fal-ai/${model}`
  const res = await fetch(`https://fal.run/${modelPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
    body: JSON.stringify({
      prompt,
      num_images: params?.n ?? 1,
      image_size: params?.width && params?.height ? `${params.width}_${params.height}` : 'square_hd',
      sync_mode: true,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FAL error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { images: Array<{ url: string; width?: number; height?: number }> }
  const img = data.images?.[0]
  if (!img?.url) throw new Error('FAL returned no image URL')
  return { url: img.url, mimeType: 'image/png', width: img.width, height: img.height }
}

async function generateStabilityImage(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<MediaResult> {
  const engine = model.includes('/') ? model.split('/').pop() : model
  const res = await fetch(`https://api.stability.ai/v1/generation/${engine}/text-to-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }],
      width: params?.width ?? 1024,
      height: params?.height ?? 1024,
      samples: 1,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Stability error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { artifacts: Array<{ base64: string }> }
  const artifact = data.artifacts?.[0]
  if (!artifact?.base64) throw new Error('Stability returned no image')
  const url = `data:image/png;base64,${artifact.base64}`
  return { url, mimeType: 'image/png', width: params?.width, height: params?.height }
}

async function generateGoogleImage(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<MediaResult> {
  const wireModel = resolveWireModel(model)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${wireModel}:generateImages`

  // Google Imagen accepts aspect_ratio as a colon-separated string ("16:9", "1:1", etc.).
  // Fall back to square when the caller doesn't specify.
  const aspectRatio = params?.aspect_ratio ?? '1:1'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      prompt: { text: prompt },
      number_of_images: Math.min(Math.max(1, params?.n ?? 1), 4),
      aspect_ratio: aspectRatio,
      safety_filter_level: 'BLOCK_MEDIUM_AND_ABOVE',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Imagen error ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json() as {
    generatedImages?: Array<{ image?: { imageBytes?: string; mimeType?: string } }>
  }
  const img = data.generatedImages?.[0]?.image
  if (!img?.imageBytes) throw new Error('Google Imagen returned no image data')

  const mimeType = img.mimeType ?? 'image/png'
  return { url: `data:${mimeType};base64,${img.imageBytes}`, mimeType }
}

async function generateElevenLabsAudio(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<MediaResult> {
  const voiceId = params?.voice_id ?? 'JBFqnCBsd6RMkjVDRZzb'
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text: prompt,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ElevenLabs error ${res.status}: ${text.slice(0, 200)}`)
  }
  const buffer = await res.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const mimeType = params?.format === 'wav' ? 'audio/wav' : 'audio/mpeg'
  return { url: `data:${mimeType};base64,${base64}`, mimeType }
}

// ─── Async provider triggers ──────────────────────────────────────────────────

async function triggerKlingVideo(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<AsyncJobResult> {
  const res = await fetch('https://api.klingai.com/v1/videos/text2video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model_name: model,
      prompt,
      duration: params?.duration_s ?? 5,
      aspect_ratio: params?.width && params?.height ? `${params.width}:${params.height}` : '16:9',
      negative_prompt: params?.negative_prompt,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kling error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { data: { task_id: string } }
  if (!data.data?.task_id) throw new Error('Kling returned no task_id')
  return { taskId: data.data.task_id, providerKey: 'kling' }
}

async function triggerOpenAIVideo(
  apiKey: string,
  model: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
): Promise<AsyncJobResult> {
  const res = await fetch('https://api.openai.com/v1/video/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, duration: params?.duration_s ?? 5 }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI video error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { id: string }
  if (!data.id) throw new Error('OpenAI video returned no task id')
  return { taskId: data.id, providerKey: 'openai' }
}

async function triggerSunoMusic(
  apiKey: string,
  _model: string,
  prompt: string,
  _params: TriggerExecutionBody['generative_media_params'],
): Promise<AsyncJobResult> {
  const res = await fetch('https://api.sunoapi.org/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ prompt, make_instrumental: false, wait_audio: false }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Suno error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { clips: Array<{ id: string }> }
  const id = data.clips?.[0]?.id
  if (!id) throw new Error('Suno returned no clip id')
  return { taskId: id, providerKey: 'suno' }
}

// ─── Dispatch: platform_credit path (Chainabit token) ────────────────────────

async function dispatchChainabit(
  chainabitToken: string,
  providerKey: string,
  modelKey: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
  modality: string,
): Promise<MediaResult | AsyncJobResult> {
  if (modality === 'image' && CHAINABIT_SUPPORTED_IMAGE_PROVIDERS.has(providerKey)) {
    return generateChainabitImage(chainabitToken, modelKey, prompt, params)
  }
  if (modality === 'video' && CHAINABIT_SUPPORTED_VIDEO_PROVIDERS.has(providerKey)) {
    const chainabitApiUrl = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
    const res = await fetch(`${chainabitApiUrl.replace(/\/$/, '')}/api/v1/ai/video/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chainabitToken}` },
      body: JSON.stringify({ model: modelKey, prompt, n: 1, duration: params?.duration_s ?? 5 }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Chainabit video error ${res.status}: ${text.slice(0, 300)}`)
    }
    const data = await res.json() as { id?: string; task_id?: string }
    const taskId = data.id ?? data.task_id
    if (!taskId) throw new Error('Chainabit video returned no task id')
    return { taskId, providerKey }
  }
  throw new Error(
    `Media generation via platform credits is not supported for provider "${providerKey}" modality "${modality}". ` +
    'Please use a BYOK cloud key for this provider.',
  )
}

// ─── Dispatch: user_byok_cloud path (direct provider call) ───────────────────

async function dispatchSync(
  providerKey: string,
  apiKey: string,
  modelKey: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
  modality: string,
): Promise<MediaResult | null> {
  if (modality === 'image') {
    if (providerKey === 'openai') return generateOpenAIImage(apiKey, modelKey, prompt, params)
    if (providerKey === 'fal') return generateFALImage(apiKey, modelKey, prompt, params)
    if (providerKey === 'stability') return generateStabilityImage(apiKey, modelKey, prompt, params)
    if (providerKey === 'google') return generateGoogleImage(apiKey, modelKey, prompt, params)
  }
  if (modality === 'audio') {
    if (providerKey === 'elevenlabs') return generateElevenLabsAudio(apiKey, modelKey, prompt, params)
  }
  return null
}

async function dispatchAsync(
  providerKey: string,
  apiKey: string,
  modelKey: string,
  prompt: string,
  params: TriggerExecutionBody['generative_media_params'],
  modality: string,
): Promise<AsyncJobResult | null> {
  if (modality === 'video') {
    if (providerKey === 'kling') return triggerKlingVideo(apiKey, modelKey, prompt, params)
    if (providerKey === 'openai') return triggerOpenAIVideo(apiKey, modelKey, prompt, params)
  }
  if (modality === 'music' || modality === 'audio') {
    if (providerKey === 'suno') return triggerSunoMusic(apiKey, modelKey, prompt, params)
  }
  return null
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) })
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errResponse('unauthenticated', 'Missing Authorization header', 401, req)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return errResponse('unauthenticated', 'Invalid or expired token', 401, req)

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: TriggerExecutionBody
  try {
    body = await req.json()
  } catch {
    return errResponse('invalid_json', 'Request body must be valid JSON', 400, req)
  }

  const { model_id: modelKey, input_snapshot, funding_source, byok_key_ref_id, generative_media_params } = body
  const modality = generative_media_params?.output_modality ?? 'image'

  // Prompt resolution order:
  //   1. generative_media_params.prompt  — explicit override from the caller
  //   2. input_snapshot.prompt           — flat-schema lenses with a single prompt field
  //   3. input_snapshot.content          — chat-style lenses
  //   4. composed from all string values — structured lenses (e.g. product_name, brand_style…)
  const explicitPrompt =
    (generative_media_params?.prompt as string | undefined) ??
    (input_snapshot?.['prompt'] as string | undefined) ??
    (input_snapshot?.['content'] as string | undefined)

  const prompt = explicitPrompt?.trim() ||
    Object.values(input_snapshot ?? {})
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join(', ')

  if (!modelKey) return errResponse('missing_fields', 'model_id is required', 400, req)
  if (!prompt) return errResponse('missing_fields', 'prompt is required: set generative_media_params.prompt, input_snapshot.prompt, or provide string fields in input_snapshot', 400, req)

  if (funding_source === 'user_byok_local') {
    return errResponse(
      'invalid_funding_source',
      'Local BYOK keys live only in the browser; this endpoint runs on the server. Switch funding to LF Cloud Keys or Chainabit for server-executed models.',
      400,
      req,
    )
  }

  // ── Resolve key / token ─────────────────────────────────────────────────────
  const providerKey = detectProvider(modelKey)
  let resolvedKey: string | null = null
  let chainabitToken: string | null = null

  if (funding_source === 'user_byok_cloud') {
    if (!byok_key_ref_id) return errResponse('missing_fields', 'byok_key_ref_id is required for user_byok_cloud', 400, req)
    try {
      resolvedKey = await resolveVaultKey(byok_key_ref_id, user.id, serviceClient)
    } catch (err: unknown) {
      return errResponse('key_resolution_failed', err instanceof Error ? err.message : 'Key resolution failed', 403, req)
    }
  } else {
    // platform_credit — user's Chainabit developer token
    try {
      chainabitToken = await resolveChainabitToken(user.id, serviceClient)
    } catch (err: unknown) {
      return errResponse('no_chainabit_account', err instanceof Error ? err.message : 'Chainabit account required', 403, req)
    }
  }

  // ── Create execution record ─────────────────────────────────────────────────
  // fn_worker_start_media_execution is a public SECURITY DEFINER wrapper that
  // resolves user_id → lenser profile and delegates to execution.fn_start_execution
  // without exposing private schemas through PostgREST.
  const { data: execRows, error: execErr } = await serviceClient.rpc('fn_worker_start_media_execution', {
    p_user_id: user.id,
    p_origin_type: body.origin_type ?? 'lens_preview',
    p_funding_source: funding_source,
    p_lens_id: body.lens_id ?? null,
    p_byok_key_ref_id: byok_key_ref_id ?? null,
    p_input_snapshot: { ...input_snapshot, prompt },
  })

  if (execErr || !execRows?.[0]) {
    console.error('fn_worker_start_media_execution error:', execErr)
    return errResponse('execution_init_failed', 'Failed to initialize execution record', 500, req)
  }

  const { run_id: runId, request_id: requestId } = execRows[0] as { run_id: string; request_id: string }

  await serviceClient
    .schema('execution')
    .from('runs')
    .update({ is_async: true })
    .eq('id', runId)

  await serviceClient
    .schema('execution')
    .from('requests')
    .update({ output_modality: modality })
    .eq('id', requestId)

  // ── Dispatch ────────────────────────────────────────────────────────────────
  try {
    let syncResult: MediaResult | null = null
    let asyncResult: AsyncJobResult | null = null

    if (chainabitToken) {
      // platform_credit path — Chainabit handles billing
      const result = await dispatchChainabit(chainabitToken, providerKey, modelKey, prompt, generative_media_params, modality)
      if ('url' in result) {
        syncResult = result as MediaResult
      } else {
        asyncResult = result as AsyncJobResult
      }
    } else if (resolvedKey) {
      // user_byok_cloud path — direct provider
      syncResult = await dispatchSync(providerKey, resolvedKey, modelKey, prompt, generative_media_params, modality)
      if (!syncResult) {
        asyncResult = await dispatchAsync(providerKey, resolvedKey, modelKey, prompt, generative_media_params, modality)
      }
    }

    if (syncResult) {
      await serviceClient.rpc('fn_complete_async_run', {
        p_run_id: runId,
        p_media_url: syncResult.url,
        p_mime_type: syncResult.mimeType,
        p_bytes: null,
        p_width: syncResult.width ?? null,
        p_height: syncResult.height ?? null,
        p_duration_s: syncResult.durationSeconds ?? null,
      })

      return jsonResponse({ execution_run_id: runId, request_id: requestId, status: 'succeeded' }, 200, req)
    }

    if (asyncResult) {
      await serviceClient
        .schema('execution')
        .from('runs')
        .update({ provider_task_id: asyncResult.taskId })
        .eq('id', runId)

      return jsonResponse({ execution_run_id: runId, request_id: requestId, status: 'running' }, 200, req)
    }

    await serviceClient
      .schema('execution')
      .from('runs')
      .update({ status: 'failed', error_code: 'unsupported_provider', completed_at: new Date().toISOString() })
      .eq('id', runId)

    return errResponse('unsupported_provider', `No handler for provider "${providerKey}" modality "${modality}"`, 422, req)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Provider call failed'
    console.error('Execution failed:', msg)

    await serviceClient
      .schema('execution')
      .from('runs')
      .update({ status: 'failed', error_code: 'provider_error', error_message: msg.slice(0, 500), completed_at: new Date().toISOString() })
      .eq('id', runId)

    return errResponse('provider_error', msg, 502, req)
  }
})
