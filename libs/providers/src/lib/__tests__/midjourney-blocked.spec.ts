/**
 * Midjourney is in the provider seed as `support_level='deprecated'` and the
 * model row `midjourney-7` is seeded with `is_active=false`. The in-code
 * registry intentionally omits it because there's no public Midjourney API
 * (see `model-registry.ts:131`).
 *
 * This spec pins the fail-closed contract end-to-end:
 *   1. The registry returns null for `midjourney-7`.
 *   2. `callGenerativeMedia` rejects with `unsupported_model` BEFORE any HTTP.
 *   3. `getMediaCapabilities` returns the empty descriptor.
 *   4. `getGenerativeAdapter('midjourney', 'image')` throws.
 */

import { callGenerativeMedia, getGenerativeAdapter } from '../../index'
import { lookupModel, modelKind } from '../model-registry'
import { getMediaCapabilities } from '../media-capabilities'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('Midjourney is blocked end-to-end', () => {
  const recorder = new ProviderRequestRecorder()

  beforeEach(() => recorder.install())
  afterEach(() => {
    recorder.uninstall()
    recorder.reset()
  })

  it('the in-code registry omits midjourney-7', () => {
    expect(lookupModel('midjourney-7')).toBeNull()
    expect(modelKind('midjourney-7')).toBeNull()
  })

  it('getMediaCapabilities returns the empty descriptor for midjourney-7', () => {
    const caps = getMediaCapabilities('midjourney-7')
    expect(caps.kind).toBeNull()
    expect(caps.imageSizes).toEqual([])
    expect(caps.aspectRatios).toEqual([])
    expect(caps.durations).toEqual([])
    expect(caps.maxBatch).toBe(1)
  })

  it('callGenerativeMedia rejects midjourney-7 with unsupported_model and zero HTTP calls', async () => {
    await expect(
      callGenerativeMedia('midjourney', 'image', 'sk-test', 'midjourney-7', 'a cat'),
    ).rejects.toMatchObject({
      code: 'unsupported_model',
    })
    recorder.assertNoCalls('midjourney pre-flight gate must throw before any HTTP')
  })

  it('callGenerativeMedia rejects midjourney-7 even when provider is left null', async () => {
    await expect(
      callGenerativeMedia(null, 'image', 'sk-test', 'midjourney-7', 'a cat'),
    ).rejects.toBeInstanceOf(ProviderError)
    recorder.assertNoCalls()
  })

  it('getGenerativeAdapter("midjourney","image") throws — no adapter wired', () => {
    // GenerativeMediaProvider type accepts `midjourney`, but the runtime
    // dispatch map has no entry. This pins that.
    expect(() => getGenerativeAdapter('midjourney', 'image')).toThrow(
      /No generative image adapter for provider: midjourney/,
    )
  })
})
