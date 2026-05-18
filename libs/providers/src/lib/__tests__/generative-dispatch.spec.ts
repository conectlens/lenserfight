/**
 * `callGenerativeMedia` pre-flight gate coverage.
 *
 * The dispatcher enforces three gates BEFORE any HTTP I/O:
 *   1. Model must exist in the registry.
 *   2. Model's declared `kind` must match the requested modality.
 *      `music` accepts `audio`-kinded models.
 *   3. An adapter must exist for `(provider, modality)`.
 *
 * The `ProviderRequestRecorder` proves zero network calls fire in every
 * rejection scenario.
 */

import { callGenerativeMedia } from '../../index'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('callGenerativeMedia — pre-flight gates', () => {
  const recorder = new ProviderRequestRecorder()

  beforeEach(() => recorder.install())
  afterEach(() => {
    recorder.uninstall()
    recorder.reset()
  })

  describe('gate 1 — unknown model', () => {
    it('rejects an unregistered model with unsupported_model and zero HTTP', async () => {
      await expect(
        callGenerativeMedia('openai', 'image', 'sk-test', 'totally-fake-model', 'a cat'),
      ).rejects.toMatchObject({ code: 'unsupported_model' })
      recorder.assertNoCalls()
    })

    it('mentions the offending model key in the error message', async () => {
      try {
        await callGenerativeMedia('openai', 'image', 'sk-test', 'totally-fake-model', 'a cat')
        throw new Error('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ProviderError)
        expect((err as ProviderError).message).toContain('totally-fake-model')
      }
    })
  })

  describe('gate 2 — modality / kind mismatch', () => {
    it('rejects requesting image from a text model (gpt-4o)', async () => {
      await expect(
        callGenerativeMedia('openai', 'image', 'sk-test', 'gpt-4o', 'a cat'),
      ).rejects.toMatchObject({ code: 'unsupported_model' })
      recorder.assertNoCalls()
    })

    it('rejects requesting video from an image model (dall-e-3)', async () => {
      await expect(
        callGenerativeMedia('openai', 'video', 'sk-test', 'dall-e-3', 'a cat'),
      ).rejects.toMatchObject({ code: 'unsupported_model' })
      recorder.assertNoCalls()
    })

    it('rejects requesting audio from a video model (sora-2.0)', async () => {
      await expect(
        callGenerativeMedia('openai', 'audio', 'sk-test', 'sora-2.0', 'a cat'),
      ).rejects.toMatchObject({ code: 'unsupported_model' })
      recorder.assertNoCalls()
    })

    it('rejects a music-kinded model when requesting modality=audio (asymmetric)', async () => {
      // The gate at `index.ts:292` widens ONLY for `modality === 'music'` —
      // music can accept audio-kinded models, but audio cannot accept
      // music-kinded models. This pins that asymmetry.
      await expect(
        callGenerativeMedia('suno', 'audio', 'sk-test', 'suno-v5', 'a tune'),
      ).rejects.toMatchObject({ code: 'unsupported_model' })
      recorder.assertNoCalls()
    })

    it('accepts a music-kinded model when requesting modality=music', async () => {
      recorder.queueResponse({
        status: 200,
        body: { id: 'suno-task-2' },
      })
      const result = await callGenerativeMedia('suno', 'music', 'sk-test', 'suno-v5', 'a tune')
      expect(result).toBeDefined()
      expect(result.status).toBe('pending')
    })

    it('rejects when the caller supplies a provider that conflicts with the registry', async () => {
      // dall-e-3 belongs to openai. Claim it's a stability model — refuse to
      // miss-route.
      await expect(
        callGenerativeMedia('stability', 'image', 'sk-test', 'dall-e-3', 'a cat'),
      ).rejects.toMatchObject({ code: 'unsupported_model' })
      recorder.assertNoCalls()
    })
  })

  describe('gate 3 — no adapter for (provider, modality)', () => {
    // The runtime adapter maps in `libs/providers/src/index.ts` skip some
    // (provider, modality) tuples that the type system allows. Midjourney is
    // the canonical example — its own block-spec exercises it.

    it('dispatch reaches elevenlabs audio adapter for modality=audio', async () => {
      // elevenlabs-v4 is kind:'audio'. modality:'audio' resolves through
      // AUDIO_ADAPTERS which includes elevenlabs. We confirm dispatch reaches
      // the adapter by queueing a raw-bytes response and asserting the
      // arrayBuffer pathway completed.
      recorder.queueResponse({
        status: 200,
        body: 'fakeaudiobytes',
        contentType: 'audio/mpeg',
      })
      const result = await callGenerativeMedia(
        'elevenlabs', 'audio', 'sk-test', 'elevenlabs-v4', 'hello',
      )
      expect(result.status).toBe('completed')
    })
  })

  describe('wire-model translation', () => {
    it('passes the resolved wire model to the adapter, not the LF canonical key', async () => {
      // dall-e-4 → wireModel 'gpt-image-1' per the registry. The body the
      // adapter constructs should carry the wire id.
      recorder.queueResponse({ body: { data: [{ url: 'https://x/y.png' }] } })
      await callGenerativeMedia('openai', 'image', 'sk-test', 'dall-e-4', 'a cat')
      expect(recorder.lastRequest?.bodyJson).toMatchObject({ model: 'gpt-image-1' })
    })
  })
})
