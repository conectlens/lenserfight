/**
 * Defect-fix regression: `callProvider` and `streamProvider` in
 * `libs/providers/src/index.ts` previously threw raw `new Error(...)` on
 * non-OK responses, leaking provider HTTP status text directly to users.
 *
 * They now route through `mapHttpError` so callers can branch on
 * `ProviderError.code` (auth_failed, rate_limited, server_error, etc.).
 * This spec pins that contract for every text provider class.
 */

import { callProvider, streamProvider } from '../../index'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

type TextProvider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama'

const PROVIDERS: { provider: TextProvider; model: string }[] = [
  { provider: 'openai',    model: 'gpt-4o-mini' },
  { provider: 'anthropic', model: 'claude-haiku-4-5' },
  { provider: 'google',    model: 'gemini-2.5-flash' },
  { provider: 'mistral',   model: 'mistral-large-3' },
  { provider: 'ollama',    model: 'llama3.2:3b-instruct' },
]

describe('callProvider — HTTP error mapping via mapHttpError', () => {
  const recorder = new ProviderRequestRecorder()

  beforeEach(() => recorder.install())
  afterEach(() => {
    recorder.uninstall()
    recorder.reset()
  })

  it.each(PROVIDERS)('$provider maps 401 to ProviderError(auth_failed)', async ({ provider, model }) => {
    recorder.queueResponse({
      status: 401,
      body: { error: { message: 'bad key' } },
    })
    try {
      await callProvider(provider, 'sk-bad', model, [{ role: 'user', content: 'hi' }])
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).code).toBe('auth_failed')
      expect((err as ProviderError).retriable).toBe(false)
    }
  })

  it.each(PROVIDERS)('$provider maps 429 to ProviderError(rate_limited)', async ({ provider, model }) => {
    recorder.queueResponse({
      status: 429,
      body: { error: { message: 'too many requests' } },
    })
    try {
      await callProvider(provider, 'sk-test', model, [{ role: 'user', content: 'hi' }])
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).code).toBe('rate_limited')
      expect((err as ProviderError).retriable).toBe(true)
    }
  })

  it.each(PROVIDERS)('$provider maps 500 to ProviderError(server_error)', async ({ provider, model }) => {
    recorder.queueResponse({
      status: 500,
      body: { error: { message: 'oops' } },
    })
    await expect(
      callProvider(provider, 'sk-test', model, [{ role: 'user', content: 'hi' }]),
    ).rejects.toMatchObject({ code: 'server_error', retriable: true })
  })

  it.each(PROVIDERS)('$provider maps 403 PERMISSION_DENIED to permission_denied', async ({ provider, model }) => {
    recorder.queueResponse({
      status: 403,
      body: { error: { status: 'PERMISSION_DENIED', message: 'denied' } },
    })
    await expect(
      callProvider(provider, 'sk-test', model, [{ role: 'user', content: 'hi' }]),
    ).rejects.toMatchObject({ code: 'permission_denied' })
  })
})

describe('streamProvider — HTTP error mapping via mapHttpError', () => {
  const recorder = new ProviderRequestRecorder()

  beforeEach(() => recorder.install())
  afterEach(() => {
    recorder.uninstall()
    recorder.reset()
  })

  it.each(PROVIDERS)('$provider maps 401 to ProviderError(auth_failed) on stream', async ({ provider, model }) => {
    recorder.queueResponse({
      status: 401,
      body: { error: { message: 'bad key' } },
    })
    try {
      await streamProvider(provider, 'sk-bad', model, [{ role: 'user', content: 'hi' }])
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).code).toBe('auth_failed')
    }
  })

  it.each(PROVIDERS)('$provider maps 429 to ProviderError(rate_limited) on stream', async ({ provider, model }) => {
    recorder.queueResponse({
      status: 429,
      body: { error: { message: 'too many' } },
    })
    await expect(
      streamProvider(provider, 'sk-test', model, [{ role: 'user', content: 'hi' }]),
    ).rejects.toMatchObject({ code: 'rate_limited' })
  })

  it.each(PROVIDERS)('$provider surfaces server_error for empty stream body', async ({ provider, model }) => {
    // Defect-fix path: a 200 with body=null used to throw a raw Error. Now it
    // surfaces as ProviderError(server_error) so the UI can render the same
    // toast it does for other transient provider failures.
    //
    // We can't construct a Response with body=null via the standard Response
    // constructor (it always provides a stream). Instead, simulate by
    // patching fetch to return a Response whose `.body` getter returns null.
    recorder.uninstall()
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      const res = new Response('', { status: 200 })
      Object.defineProperty(res, 'body', { get: () => null })
      return res
    }) as typeof fetch
    try {
      await expect(
        streamProvider(provider, 'sk-test', model, [{ role: 'user', content: 'hi' }]),
      ).rejects.toMatchObject({ code: 'server_error' })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
