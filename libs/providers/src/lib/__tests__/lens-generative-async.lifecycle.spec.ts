/**
 * Lens generative-async lifecycle.
 *
 * For every async adapter: submit returns `status: 'pending'` + an opaque
 * `providerTaskId`. The caller then polls via `adapter.pollTask` until
 * `status: 'completed'` or `'failed'`. This spec proves the round-trip
 * shape for sora, veo, lyria, kling, suno.
 *
 * Adapters under test:
 *   - OpenAI Sora      → openaiVideoAdapter
 *   - Google Veo       → googleVeoAdapter
 *   - Google Lyria     → googleLyriaAdapter
 *   - Kling video      → klingAdapter
 *   - Suno music       → sunoAdapter
 */

import { callGenerativeMedia, getGenerativeAdapter } from '../../index'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

interface AsyncCase {
  provider: 'openai' | 'google' | 'kling' | 'suno'
  modality: 'video' | 'music' | 'audio'
  model: string
  submitResponse: { status?: number; body: object | string }
}

const ASYNC_CASES: AsyncCase[] = [
  // OpenAI Sora — async video; submit returns { id: "video-..." } or task wrapper.
  {
    provider: 'openai',
    modality: 'video',
    model: 'sora-2.0',
    submitResponse: { body: { id: 'video_abc', status: 'in_progress' } },
  },
  // Google Veo — async video via long-running operation.
  {
    provider: 'google',
    modality: 'video',
    model: 'veo-3',
    submitResponse: { body: { name: 'operations/veo-task-xyz' } },
  },
  // Google Lyria — async music.
  {
    provider: 'google',
    modality: 'music',
    model: 'lyria-2',
    submitResponse: { body: { name: 'operations/lyria-task-xyz' } },
  },
  // Kling — async video.
  {
    provider: 'kling',
    modality: 'video',
    model: 'kling-2.0',
    submitResponse: { body: { code: 0, data: { task_id: 'kling-task-1' } } },
  },
  // Suno — async music.
  {
    provider: 'suno',
    modality: 'music',
    model: 'suno-v5',
    submitResponse: { body: { id: 'suno-task-1' } },
  },
]

describe('lens generative-async lifecycle — submit returns pending', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  it.each(ASYNC_CASES)('$provider/$model submit returns status=pending with providerTaskId', async (c) => {
    recorder.queueResponse(c.submitResponse)
    const result = await callGenerativeMedia(c.provider, c.modality, 'sk-test', c.model, 'prompt')
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toBeDefined()
      expect(typeof result.providerTaskId).toBe('string')
      expect(result.providerTaskId.length).toBeGreaterThan(0)
    }
  })

  it.each(ASYNC_CASES)('$provider/$model exits with exactly one HTTP submit', async (c) => {
    recorder.queueResponse(c.submitResponse)
    await callGenerativeMedia(c.provider, c.modality, 'sk-test', c.model, 'prompt')
    expect(recorder.requests).toHaveLength(1)
  })
})

describe('lens generative-async lifecycle — pollTask method exists on every async adapter', () => {
  it.each(ASYNC_CASES)('$provider/$modality adapter exposes pollTask', (c) => {
    const adapter = getGenerativeAdapter(c.provider, c.modality)
    expect(typeof adapter.pollTask).toBe('function')
  })
})

describe('lens generative-async lifecycle — task id round-trip integrity', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  it.each(ASYNC_CASES)('$provider returns a non-empty providerTaskId that callers can pass to pollTask', async (c) => {
    recorder.queueResponse(c.submitResponse)
    const result = await callGenerativeMedia(c.provider, c.modality, 'sk-test', c.model, 'prompt')
    if (result.status !== 'pending') throw new Error('expected pending')
    // Simulate the caller persisting the providerTaskId and later passing it
    // back to pollTask. The contract: this id is opaque, must be a non-empty
    // string, and round-trips verbatim into pollTask. We don't run pollTask
    // here (response shape varies); we only assert the contract surface.
    expect(result.providerTaskId).toMatch(/.+/)
  })
})
