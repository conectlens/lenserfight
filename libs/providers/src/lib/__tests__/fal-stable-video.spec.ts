/**
 * fal-stable-video (image-to-video) adapter contract.
 *
 * Distinctive: auth header uses `Key <apiKey>`, not `Bearer`. Endpoint is
 * fal.run/fal-ai/stable-video-diffusion. Required param `image_url` is
 * validated pre-flight; `motion_bucket_id` clamped to [1,255], `fps` to
 * [1,30].
 */

import { falStableVideoAdapter } from '../fal-stable-video'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('fal-stable-video adapter — contract', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  describe('authHeader', () => {
    it('uses "Key <apiKey>" prefix, not Bearer', () => {
      expect(falStableVideoAdapter.authHeader('fal-test')).toEqual({
        Authorization: 'Key fal-test',
      })
    })
  })

  describe('pre-flight validation', () => {
    it('rejects when params.image_url is missing', async () => {
      await expect(
        falStableVideoAdapter.generate('fal-test', 'stable-video', 'unused-prompt', {}),
      ).rejects.toMatchObject({ code: 'invalid_request' })
      recorder.assertNoCalls('image_url is required — must reject before HTTP')
    })

    it('rejects when params is omitted entirely', async () => {
      await expect(
        falStableVideoAdapter.generate('fal-test', 'stable-video', 'unused-prompt'),
      ).rejects.toMatchObject({ code: 'invalid_request' })
    })
  })

  describe('request shape', () => {
    it('POSTs to fal.run/fal-ai/stable-video-diffusion with JSON body', async () => {
      recorder.queueResponse({ body: { video: { url: 'https://x/y.mp4' } } })
      await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
        image_url: 'https://x/source.png',
      })
      const req = recorder.lastRequest
      expect(req?.url).toBe('https://fal.run/fal-ai/stable-video-diffusion')
      expect(req?.method).toBe('POST')
      expect(req?.bodyJson).toMatchObject({
        image_url: 'https://x/source.png',
        motion_bucket_id: 127,
        fps: 6,
      })
    })

    it('clamps motion_bucket_id to [1,255]', async () => {
      recorder.queueResponse({ body: { video: { url: 'https://x/y.mp4' } } })
      await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
        image_url: 'https://x/source.png',
        motion_bucket_id: 9999,
      })
      expect(recorder.lastRequest?.bodyJson?.motion_bucket_id).toBe(255)
    })

    it('clamps motion_bucket_id to floor 1', async () => {
      recorder.queueResponse({ body: { video: { url: 'https://x/y.mp4' } } })
      await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
        image_url: 'https://x/source.png',
        motion_bucket_id: -10,
      })
      expect(recorder.lastRequest?.bodyJson?.motion_bucket_id).toBe(1)
    })

    it('clamps fps to [1,30]', async () => {
      recorder.queueResponse({ body: { video: { url: 'https://x/y.mp4' } } })
      await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
        image_url: 'https://x/source.png',
        fps: 999,
      })
      expect(recorder.lastRequest?.bodyJson?.fps).toBe(30)
    })

    it('attaches Key auth header', async () => {
      recorder.queueResponse({ body: { video: { url: 'https://x/y.mp4' } } })
      await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
        image_url: 'https://x/source.png',
      })
      expect(recorder.lastRequest?.headers['authorization']).toBe('Key fal-test')
    })
  })

  describe('response handling', () => {
    it('returns completed mp4 video URL', async () => {
      recorder.queueResponse({ body: { video: { url: 'https://fal.run/output.mp4' } } })
      const result = await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
        image_url: 'https://x/source.png',
      })
      expect(result).toMatchObject({
        status: 'completed',
        urls: ['https://fal.run/output.mp4'],
        mimeType: 'video/mp4',
      })
    })

    it('throws server_error when response omits video.url', async () => {
      recorder.queueResponse({ body: {} })
      try {
        await falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
          image_url: 'https://x/source.png',
        })
        throw new Error('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ProviderError)
        expect((err as ProviderError).code).toBe('server_error')
      }
    })
  })

  describe('error mapping', () => {
    it('maps 401 to auth_failed', async () => {
      recorder.queueResponse({ status: 401, body: { error: 'bad key' } })
      await expect(
        falStableVideoAdapter.generate('fal-bad', 'stable-video', '_', {
          image_url: 'https://x/source.png',
        }),
      ).rejects.toMatchObject({ code: 'auth_failed' })
    })

    it('maps 429 to rate_limited', async () => {
      recorder.queueResponse({ status: 429, body: { error: 'too many' } })
      await expect(
        falStableVideoAdapter.generate('fal-test', 'stable-video', '_', {
          image_url: 'https://x/source.png',
        }),
      ).rejects.toMatchObject({ code: 'rate_limited' })
    })
  })
})
