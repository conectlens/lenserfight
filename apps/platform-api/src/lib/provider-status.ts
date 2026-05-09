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

// AN ships: openai-video, google-veo, kling
// AO ships: suno, google-lyria
// They register via registerProviderStatusChecker(...) at module-init time.

export const __testing = {
  /** Test helper — replaces all registered checkers for a single test. */
  resetCheckers(): void {
    checkers.clear()
  },
  registerProviderStatusChecker,
}
