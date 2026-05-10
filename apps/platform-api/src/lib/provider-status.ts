// Phase AM — provider status checkers.
//
// Each provider exposes a different polling shape:
//   - fal.ai   → /requests/:task_id → response.status: IN_PROGRESS / COMPLETED / FAILED
//   - openai-video (Sora) → /v1/video/generations/:task_id → status: queued/processing/succeeded/failed
//   - google-veo → operations API → done: bool, response or error
//   - kling      → /tasks/:task_id → task_status: submitted/processing/succeed/failed
//
// We normalize these into a single ProviderStatusResult shape so the
// async-media-poll-worker stays provider-agnostic.
//
// AN/AO/AP add concrete provider implementations. AM ships the registry +
// fal.ai checker (the only currently-registered async provider) so the
// poll worker has something to call against once Phase AK image generation
// flows through fal as an async submission.

export type ProviderStatusState = 'pending' | 'completed' | 'failed'

export interface ProviderStatusResult {
  state: ProviderStatusState
  mediaUrl?: string
  mimeType?: string
  bytes?: number
  width?: number
  height?: number
  durationSeconds?: number
  errorCode?: string
  errorMessage?: string
}

export interface CheckProviderStatusInput {
  providerKey: string | null
  modelKey:    string | null
  taskId:      string
  modality:    string | null
}

type StatusChecker = (input: CheckProviderStatusInput) => Promise<ProviderStatusResult>

const checkers = new Map<string, StatusChecker>()

export function registerProviderStatusChecker(providerKey: string, checker: StatusChecker): void {
  checkers.set(providerKey, checker)
}

export async function checkProviderStatus(
  input: CheckProviderStatusInput,
): Promise<ProviderStatusResult> {
  const key = (input.providerKey ?? '').toLowerCase()
  const checker = checkers.get(key)
  if (!checker) {
    throw new Error(`provider_status_checker_missing: ${input.providerKey ?? 'unknown'}`)
  }
  return checker(input)
}

// ── Default checkers ──────────────────────────────────────────────────────

/**
 * Fal AI status checker — uses the `@fal-ai/client` queue API.
 * Imports the client lazily so worker bundles that never poll fal don't
 * pay the bundle cost.
 */
async function falStatusChecker(input: CheckProviderStatusInput): Promise<ProviderStatusResult> {
  const { fal } = await import('@fal-ai/client')

  if (!input.modelKey) {
    return { state: 'failed', errorCode: 'missing_model_key', errorMessage: 'Cannot poll fal without modelKey' }
  }

  const status = await fal.queue.status(input.modelKey, { requestId: input.taskId })
  // The fal client returns a discriminated union; we narrow by `status` field.
  const raw = status as unknown as { status: string; queue_position?: number }

  switch (raw.status) {
    case 'COMPLETED': {
      const result = await fal.queue.result(input.modelKey, { requestId: input.taskId })
      const data = (result?.data ?? {}) as Record<string, unknown>
      // Reuse the same output detection as fal-ai.provider.ts.
      if (Array.isArray(data['images']) && (data['images'] as unknown[]).length > 0) {
        const img = (data['images'] as Array<{ url: string; width?: number; height?: number }>)[0]
        return {
          state:    'completed',
          mediaUrl: img.url,
          mimeType: 'image/png',
          width:    img.width,
          height:   img.height,
        }
      }
      if (typeof data['video'] === 'object' && data['video'] !== null) {
        const vid = data['video'] as { url: string }
        return { state: 'completed', mediaUrl: vid.url, mimeType: 'video/mp4' }
      }
      if (typeof data['audio_url'] === 'string') {
        return { state: 'completed', mediaUrl: data['audio_url'] as string, mimeType: 'audio/mpeg' }
      }
      return {
        state:        'failed',
        errorCode:    'fal_unknown_shape',
        errorMessage: `Unrecognised fal output for ${input.modelKey}`,
      }
    }
    case 'FAILED':
    case 'CANCELED':
      return {
        state:        'failed',
        errorCode:    'fal_failed',
        errorMessage: `fal status: ${raw.status}`,
      }
    case 'IN_QUEUE':
    case 'IN_PROGRESS':
    default:
      return { state: 'pending' }
  }
}

registerProviderStatusChecker('fal', falStatusChecker)
registerProviderStatusChecker('fal-ai', falStatusChecker)

// ── Phase AN: video provider checkers ────────────────────────────────────────

async function openaiVideoStatusChecker(
  input: CheckProviderStatusInput,
): Promise<ProviderStatusResult> {
  const apiKey = process.env['OPENAI_API_KEY'] ?? ''
  const res = await fetch(`https://api.openai.com/v1/video/generations/${input.taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    return {
      state:        'failed',
      errorCode:    `sora_poll_${res.status}`,
      errorMessage: `Sora poll returned HTTP ${res.status}`,
    }
  }
  const data = (await res.json()) as {
    status: string
    data?: Array<{ url: string; duration?: number }>
  }
  if (data.status === 'succeeded' && data.data?.length) {
    const clip = data.data[0]
    return {
      state:           'completed',
      mediaUrl:        clip.url,
      mimeType:        'video/mp4',
      durationSeconds: clip.duration ?? undefined,
    }
  }
  if (data.status === 'failed') {
    return { state: 'failed', errorCode: 'sora_failed', errorMessage: 'Sora generation failed' }
  }
  return { state: 'pending' }
}

async function googleVeoStatusChecker(
  input: CheckProviderStatusInput,
): Promise<ProviderStatusResult> {
  const apiKey = process.env['GOOGLE_AI_API_KEY'] ?? ''
  // taskId holds the full operation name returned by the Veo submission call.
  const res = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/${input.taskId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!res.ok) {
    return {
      state:        'failed',
      errorCode:    `veo_poll_${res.status}`,
      errorMessage: `Veo operation poll returned HTTP ${res.status}`,
    }
  }
  const data = (await res.json()) as {
    done?: boolean
    error?: { message: string }
    response?: {
      generateVideoResponse?: {
        generatedSamples?: Array<{ video?: { uri: string }; durationSeconds?: number }>
      }
    }
  }
  if (data.error) {
    return { state: 'failed', errorCode: 'veo_error', errorMessage: data.error.message }
  }
  if (!data.done) return { state: 'pending' }

  const samples = data.response?.generateVideoResponse?.generatedSamples ?? []
  if (samples.length) {
    const sample = samples[0]
    return {
      state:           'completed',
      mediaUrl:        sample.video?.uri,
      mimeType:        'video/mp4',
      durationSeconds: sample.durationSeconds ?? undefined,
    }
  }
  return { state: 'failed', errorCode: 'veo_no_samples', errorMessage: 'No video samples returned' }
}

async function klingStatusChecker(
  input: CheckProviderStatusInput,
): Promise<ProviderStatusResult> {
  const apiKey = process.env['KLING_API_KEY'] ?? ''
  const res = await fetch(`https://api.klingai.com/v1/videos/text2video/${input.taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    return {
      state:        'failed',
      errorCode:    `kling_poll_${res.status}`,
      errorMessage: `Kling poll returned HTTP ${res.status}`,
    }
  }
  const data = (await res.json()) as {
    data?: {
      task_status: string
      task_result?: { videos?: Array<{ url: string; duration?: string }> }
    }
  }
  const task = data.data
  if (!task) return { state: 'failed', errorCode: 'kling_no_data' }

  if (task.task_status === 'succeed') {
    const video = task.task_result?.videos?.[0]
    return {
      state:           'completed',
      mediaUrl:        video?.url,
      mimeType:        'video/mp4',
      durationSeconds: video?.duration ? Number.parseFloat(video.duration) : undefined,
    }
  }
  if (task.task_status === 'failed') {
    return { state: 'failed', errorCode: 'kling_failed' }
  }
  return { state: 'pending' }
}

registerProviderStatusChecker('openai-video', openaiVideoStatusChecker)
registerProviderStatusChecker('sora', openaiVideoStatusChecker)
registerProviderStatusChecker('google-veo', googleVeoStatusChecker)
registerProviderStatusChecker('veo', googleVeoStatusChecker)
registerProviderStatusChecker('kling', klingStatusChecker)

// ── Phase AO: audio provider checkers ────────────────────────────────────────

async function sunoStatusChecker(
  input: CheckProviderStatusInput,
): Promise<ProviderStatusResult> {
  const apiKey = process.env['SUNO_API_KEY'] ?? ''
  const res = await fetch(
    `https://api.sunoapi.org/api/get?ids=${encodeURIComponent(input.taskId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!res.ok) {
    return {
      state:        'failed',
      errorCode:    `suno_poll_${res.status}`,
      errorMessage: `Suno poll returned HTTP ${res.status}`,
    }
  }
  const data = (await res.json()) as Array<{
    status?: string
    audio_url?: string
    duration?: number
  }>
  const clip = data[0]
  if (!clip) return { state: 'pending' }

  if (clip.status === 'complete' && clip.audio_url) {
    return {
      state:           'completed',
      mediaUrl:        clip.audio_url,
      mimeType:        'audio/mpeg',
      durationSeconds: clip.duration ?? undefined,
    }
  }
  if (clip.status === 'error') {
    return { state: 'failed', errorCode: 'suno_error' }
  }
  return { state: 'pending' }
}

async function googleLyriaStatusChecker(
  input: CheckProviderStatusInput,
): Promise<ProviderStatusResult> {
  // Lyria uses the same Google Operations API as Veo — share the poll pattern.
  const apiKey = process.env['GOOGLE_AI_API_KEY'] ?? ''
  const res = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/${input.taskId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!res.ok) {
    return {
      state:        'failed',
      errorCode:    `lyria_poll_${res.status}`,
      errorMessage: `Lyria operation poll returned HTTP ${res.status}`,
    }
  }
  const data = (await res.json()) as {
    done?: boolean
    error?: { message: string }
    response?: { audioContent?: string; durationSeconds?: number }
  }
  if (data.error) {
    return { state: 'failed', errorCode: 'lyria_error', errorMessage: data.error.message }
  }
  if (!data.done) return { state: 'pending' }

  if (data.response?.audioContent) {
    return {
      state:           'completed',
      mediaUrl:        `data:audio/mpeg;base64,${data.response.audioContent}`,
      mimeType:        'audio/mpeg',
      durationSeconds: data.response.durationSeconds ?? undefined,
    }
  }
  return { state: 'failed', errorCode: 'lyria_no_content' }
}

registerProviderStatusChecker('suno', sunoStatusChecker)
registerProviderStatusChecker('google-lyria', googleLyriaStatusChecker)
registerProviderStatusChecker('lyria', googleLyriaStatusChecker)

export const __testing = {
  /** Test helper — replaces all registered checkers for a single test. */
  resetCheckers(): void {
    checkers.clear()
  },
  registerProviderStatusChecker,
}
