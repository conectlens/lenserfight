/**
 * Matrix-driven negative-path coverage.
 *
 * For every model in the registry, asserts that requesting an INCOMPATIBLE
 * modality through `callGenerativeMedia` rejects with `unsupported_model`
 * BEFORE any HTTP call. The recorder enforces zero-network for each row.
 *
 * Funding-source negatives (BYOK-only on platform_credit, local on cloud,
 * etc.) live at the edge-function / BYOK-resolver layer and are covered by
 * the Phase 4 lifecycle suites; this spec stays in-library and proves the
 * pre-flight contract for the `callGenerativeMedia` seam.
 */

import { callGenerativeMedia } from '../../index'
import { listModels, type ModelDescriptor } from '../model-registry'
import { ProviderError } from '../provider-errors'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

type Modality = 'image' | 'video' | 'audio' | 'music'

const ALL_MODALITIES: Modality[] = ['image', 'video', 'audio', 'music']

/**
 * `callGenerativeMedia` does NOT accept `'text'` modality — it's the
 * generative-media dispatcher. Text streaming is handled by `streamProvider`
 * elsewhere. So text models in the registry can be challenged against every
 * one of the four media modalities and must reject all of them.
 */
function modalitiesIncompatibleWith(descriptor: ModelDescriptor): Modality[] {
  return ALL_MODALITIES.filter((mod) => {
    if (mod === 'music') return descriptor.kind !== 'music' && descriptor.kind !== 'audio'
    return descriptor.kind !== mod
  })
}

describe('negative paths — every model rejects every incompatible modality', () => {
  const recorder = new ProviderRequestRecorder()

  beforeEach(() => recorder.install())
  afterEach(() => {
    recorder.uninstall()
    recorder.reset()
  })

  const cases = listModels().flatMap((m) =>
    modalitiesIncompatibleWith(m).map((modality) => ({ m, modality })),
  )

  // Sanity — should produce a non-trivial number of negative cases.
  it('enumerates a meaningful number of negative combinations', () => {
    expect(cases.length).toBeGreaterThanOrEqual(80)
  })

  it.each(cases)('$m.provider/$m.key rejects modality=$modality', async ({ m, modality }) => {
    try {
      await callGenerativeMedia(
        m.provider as Parameters<typeof callGenerativeMedia>[0],
        modality,
        'sk-test',
        m.key,
        'prompt',
      )
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).code).toBe('unsupported_model')
    }
    recorder.assertNoCalls(`${m.provider}/${m.key} with modality=${modality} must not reach the wire`)
  })
})

describe('negative paths — unknown models reject for every modality', () => {
  const recorder = new ProviderRequestRecorder()

  beforeEach(() => recorder.install())
  afterEach(() => {
    recorder.uninstall()
    recorder.reset()
  })

  const unknownModels = [
    'totally-fake-model',
    'gpt-99',
    'claude-opus-99',
    'midjourney-7',          // deprecated, seed says is_active=false
    'deepseek-coder-99',     // catalog_only provider
    '',                      // empty string
  ]

  it.each(
    unknownModels.flatMap((model) =>
      ALL_MODALITIES.map((modality) => ({ model, modality })),
    ),
  )('rejects unknown model "$model" for modality=$modality', async ({ model, modality }) => {
    await expect(
      callGenerativeMedia(null, modality as Modality, 'sk-test', model, 'prompt'),
    ).rejects.toMatchObject({ code: 'unsupported_model' })
    recorder.assertNoCalls()
  })
})
