/**
 * Stability AI image-adapter contract.
 *
 * Stability accepts `multipart/form-data` (NOT JSON). The recorder captures
 * the raw FormData body via the `bodyText` field as null (multipart is not
 * stringified), so most contract assertions here focus on URL routing, auth,
 * response handling, and pre-flight validation.
 */

import { stabilityAdapter } from '../stability'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('stability image adapter — contract', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  describe('authHeader', () => {
    it('returns Bearer token', () => {
      expect(stabilityAdapter.authHeader('sk-stab-xxx')).toEqual({
        Authorization: 'Bearer sk-stab-xxx',
      })
    })
  })

  describe('pre-flight validation', () => {
    it('rejects an empty prompt with invalid_request ProviderError', async () => {
      await expect(
        stabilityAdapter.generate('sk-test', 'sd3.5-large', '   '),
      ).rejects.toMatchObject({ code: 'invalid_request' })
      recorder.assertNoCalls('empty prompt must not reach the wire')
    })

    it('rejects an entirely missing prompt', async () => {
      await expect(
        stabilityAdapter.generate('sk-test', 'sd3.5-large', ''),
      ).rejects.toMatchObject({ code: 'invalid_request' })
    })
  })

  describe('URL routing by model', () => {
    it('routes sd3.5-large to /v2beta/stable-image/generate/sd3', async () => {
      recorder.queueResponse({ status: 200, body: 'fakeimgbytes', contentType: 'image/png' })
      await stabilityAdapter.generate('sk-test', 'sd3.5-large', 'a cat')
      expect(recorder.lastRequest?.url).toMatch(/\/v2beta\/stable-image\/generate\/sd3$/)
    })

    it('routes "core" to /v2beta/stable-image/generate/core', async () => {
      recorder.queueResponse({ status: 200, body: 'fakeimgbytes', contentType: 'image/png' })
      await stabilityAdapter.generate('sk-test', 'core', 'a cat')
      expect(recorder.lastRequest?.url).toMatch(/\/v2beta\/stable-image\/generate\/core$/)
    })

    it('routes "ultra" to /v2beta/stable-image/generate/ultra', async () => {
      recorder.queueResponse({ status: 200, body: 'fakeimgbytes', contentType: 'image/png' })
      await stabilityAdapter.generate('sk-test', 'ultra', 'a cat')
      expect(recorder.lastRequest?.url).toMatch(/\/v2beta\/stable-image\/generate\/ultra$/)
    })

    it('falls back to /core for unknown model keys', async () => {
      recorder.queueResponse({ status: 200, body: 'fakeimgbytes', contentType: 'image/png' })
      await stabilityAdapter.generate('sk-test', 'totally-unknown', 'a cat')
      expect(recorder.lastRequest?.url).toMatch(/\/v2beta\/stable-image\/generate\/core$/)
    })
  })

  describe('response handling', () => {
    it('returns a data URL with image/png mime', async () => {
      recorder.queueResponse({ status: 200, body: 'imgbytes', contentType: 'image/png' })
      const result = await stabilityAdapter.generate('sk-test', 'sd3.5-large', 'a cat')
      expect(result.status).toBe('completed')
      if (result.status === 'completed') {
        expect(result.mimeType).toBe('image/png')
        expect(result.urls[0]).toMatch(/^data:image\/png;base64,/)
      }
    })

    it('throws server_error on empty body', async () => {
      recorder.queueResponse({ status: 200, body: '', contentType: 'image/png' })
      try {
        await stabilityAdapter.generate('sk-test', 'sd3.5-large', 'a cat')
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
        stabilityAdapter.generate('sk-bad', 'sd3.5-large', 'a cat'),
      ).rejects.toMatchObject({ code: 'auth_failed' })
    })

    it('maps 429 to rate_limited (retriable)', async () => {
      recorder.queueResponse({ status: 429, body: { error: 'too many' } })
      await expect(
        stabilityAdapter.generate('sk-test', 'sd3.5-large', 'a cat'),
      ).rejects.toMatchObject({ code: 'rate_limited', retriable: true })
    })

    it('maps 500 to server_error', async () => {
      recorder.queueResponse({ status: 500, body: { error: 'oops' } })
      await expect(
        stabilityAdapter.generate('sk-test', 'sd3.5-large', 'a cat'),
      ).rejects.toMatchObject({ code: 'server_error' })
    })
  })
})
