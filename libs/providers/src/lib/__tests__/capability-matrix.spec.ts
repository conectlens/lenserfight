/**
 * Drift gate for the capability matrix.
 *
 * Catches: a model added to the registry that doesn't have an execution
 * pattern declared; a provider key in the registry that isn't in the
 * support-level map; nondeterministic matrix ordering.
 */

import {
  buildCapabilityMatrix,
  PROVIDER_SUPPORT_LEVEL,
  LOCAL_PROVIDERS,
  CHAINABIT_GATEWAY_PROVIDERS,
} from '../capability-matrix'
import { listModels } from '../model-registry'

describe('capability matrix — drift gates', () => {
  const matrix = buildCapabilityMatrix()

  it('returns a non-empty matrix', () => {
    expect(matrix.length).toBeGreaterThan(0)
  })

  it('every registry model appears in at least one row', () => {
    const inMatrix = new Set(matrix.map((e) => e.model))
    const missing = listModels()
      .map((m) => m.key)
      .filter((k) => !inMatrix.has(k))
    expect(missing).toEqual([])
  })

  it('every row has a known provider support level', () => {
    const orphans = matrix.filter((e) => !(e.provider in PROVIDER_SUPPORT_LEVEL))
    expect(orphans.map((e) => `${e.provider}/${e.model}`)).toEqual([])
  })

  it('every row\'s supportLevel matches PROVIDER_SUPPORT_LEVEL', () => {
    const mismatched = matrix.filter(
      (e) => e.supportLevel !== PROVIDER_SUPPORT_LEVEL[e.provider],
    )
    expect(mismatched).toEqual([])
  })

  it('local-provider rows only ever pair with user_byok_local', () => {
    for (const e of matrix) {
      if (LOCAL_PROVIDERS.has(e.provider)) {
        expect(e.fundingSource).toBe('user_byok_local')
      }
    }
  })

  it('platform_credit rows only appear for chainabit-gateway providers', () => {
    for (const e of matrix) {
      if (e.fundingSource === 'platform_credit') {
        expect(CHAINABIT_GATEWAY_PROVIDERS.has(e.provider)).toBe(true)
      }
    }
  })

  it('text-kind models map to lens.text_stream (never to generative_*)', () => {
    const wrong = matrix.filter(
      (e) =>
        e.modality === 'text' &&
        (e.executionPath === 'lens.generative_sync' ||
          e.executionPath === 'lens.generative_async_poll'),
    )
    expect(wrong).toEqual([])
  })

  it('image-kind models never appear on lens.text_stream', () => {
    const wrong = matrix.filter(
      (e) => e.modality === 'image' && e.executionPath === 'lens.text_stream',
    )
    expect(wrong).toEqual([])
  })

  it('sync-pattern rows never appear on lens.generative_async_poll', () => {
    const wrong = matrix.filter(
      (e) => e.pattern === 'sync' && e.executionPath === 'lens.generative_async_poll',
    )
    expect(wrong).toEqual([])
  })

  it('async-pattern rows never appear on lens.generative_sync', () => {
    const wrong = matrix.filter(
      (e) => e.pattern === 'async' && e.executionPath === 'lens.generative_sync',
    )
    expect(wrong).toEqual([])
  })

  it('runnable rows never carry an expectedErrorCode', () => {
    const wrong = matrix.filter((e) => e.expected === 'runnable' && e.expectedErrorCode)
    expect(wrong).toEqual([])
  })

  it('gated rows always carry an expectedErrorCode', () => {
    const wrong = matrix.filter((e) => e.expected !== 'runnable' && !e.expectedErrorCode)
    expect(wrong).toEqual([])
  })

  it('matrix order is deterministic across builds', () => {
    const a = buildCapabilityMatrix()
    const b = buildCapabilityMatrix()
    expect(a.map((e) => `${e.provider}/${e.model}/${e.executionPath}/${e.fundingSource}`))
      .toEqual(b.map((e) => `${e.provider}/${e.model}/${e.executionPath}/${e.fundingSource}`))
  })

  it('text models stream through SSE or NDJSON only', () => {
    const wrong = matrix.filter((e) => e.modality === 'text' && e.pattern !== 'stream')
    expect(wrong).toEqual([])
  })

  it('midjourney is intentionally absent from the matrix (no registry entry)', () => {
    expect(matrix.find((e) => e.provider === 'midjourney')).toBeUndefined()
  })

  it('catalog-only providers do not have models in the registry (no matrix rows)', () => {
    const catalogOnly = Object.entries(PROVIDER_SUPPORT_LEVEL)
      .filter(([, level]) => level === 'catalog_only')
      .map(([key]) => key)
    for (const key of catalogOnly) {
      expect(matrix.find((e) => e.provider === key)).toBeUndefined()
    }
  })
})
