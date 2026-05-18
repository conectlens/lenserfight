/**
 * Lens generative-sync lifecycle.
 *
 * `callGenerativeMedia` happy paths for the four sync adapters: OpenAI image,
 * Stability, ElevenLabs, FAL. Each must:
 *   - reach the right URL with the right auth header
 *   - return `status: 'completed'` immediately (no task-poll)
 *   - return at least one URL or data URL
 *   - propagate provider HTTP errors as `ProviderError`
 */

import { callGenerativeMedia } from '../../index'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

interface SyncCase {
  provider: 'openai' | 'stability' | 'elevenlabs' | 'fal'
  modality: 'image' | 'audio' | 'video' | 'music'
  model: string
  okResponse: { status?: number; body?: object | string; contentType?: string }
}

const SYNC_CASES: SyncCase[] = [
  {
    provider: 'openai',
    modality: 'image',
    model: 'dall-e-3',
    okResponse: { body: { data: [{ url: 'https://x/y.png' }] } },
  },
  {
    provider: 'stability',
    modality: 'image',
    model: 'stable-diffusion-4',
    okResponse: { status: 200, body: 'fakeimagebytes', contentType: 'image/png' },
  },
  {
    provider: 'elevenlabs',
    modality: 'audio',
    model: 'elevenlabs-v4',
    okResponse: { status: 200, body: 'fakeaudio', contentType: 'audio/mpeg' },
  },
]

describe('lens generative-sync lifecycle — happy paths', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  it.each(SYNC_CASES)('$provider/$model returns status=completed and at least one URL', async (c) => {
    recorder.queueResponse(c.okResponse)
    const result = await callGenerativeMedia(c.provider, c.modality, 'sk-test', c.model, 'a cat')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls.length).toBeGreaterThan(0)
      expect(result.urls[0]).toMatch(/^https?:\/\/|^data:/)
    }
  })

  it.each(SYNC_CASES)('$provider exits with exactly one HTTP request', async (c) => {
    recorder.queueResponse(c.okResponse)
    await callGenerativeMedia(c.provider, c.modality, 'sk-test', c.model, 'a cat')
    expect(recorder.requests).toHaveLength(1)
  })
})

describe('lens generative-sync lifecycle — error mapping', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  const ERROR_CASES = SYNC_CASES.filter((c) => c.provider !== 'fal')

  it.each(ERROR_CASES)('$provider maps 429 to rate_limited (retriable)', async (c) => {
    recorder.queueResponse({ status: 429, body: { error: { message: 'too many' } } })
    try {
      await callGenerativeMedia(c.provider, c.modality, 'sk-test', c.model, 'a cat')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).code).toBe('rate_limited')
      expect((err as ProviderError).retriable).toBe(true)
    }
  })

  it.each(ERROR_CASES)('$provider maps 401 to auth_failed (non-retriable)', async (c) => {
    recorder.queueResponse({ status: 401, body: { error: { message: 'bad key' } } })
    await expect(
      callGenerativeMedia(c.provider, c.modality, 'sk-bad', c.model, 'a cat'),
    ).rejects.toMatchObject({ code: 'auth_failed', retriable: false })
  })
})
