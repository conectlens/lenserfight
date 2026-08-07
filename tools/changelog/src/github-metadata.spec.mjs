import { describe, expect, it } from 'vitest'

import { fetchPrMetadata, fetchManyPrMetadata } from './github-metadata.mjs'

describe('fetchPrMetadata', () => {
  it('returns enriched data when the exec succeeds', () => {
    const result = fetchPrMetadata(100, {
      exec: () => ({ title: 'Add CSV export', labels: ['area:web'], mergedAt: '2026-08-01T00:00:00Z' }),
    })
    expect(result).toEqual({
      available: true,
      title: 'Add CSV export',
      labels: ['area:web'],
      mergedAt: '2026-08-01T00:00:00Z',
    })
  })

  it('degrades to { available: false } on any failure — never throws', () => {
    const result = fetchPrMetadata(100, {
      exec: () => {
        throw new Error('gh: command not found')
      },
    })
    expect(result).toEqual({ available: false })
  })

  it('degrades cleanly when gh returns malformed JSON', () => {
    const result = fetchPrMetadata(100, {
      exec: () => {
        throw new SyntaxError('Unexpected token')
      },
    })
    expect(result.available).toBe(false)
  })
})

describe('fetchManyPrMetadata', () => {
  it('resolves each PR independently — one failure does not affect the others', () => {
    const exec = (n) => {
      if (n === 2) throw new Error('rate limited')
      return { title: `PR ${n}` }
    }
    const result = fetchManyPrMetadata([1, 2, 3], { exec })
    expect(result.get(1)).toEqual({ available: true, title: 'PR 1' })
    expect(result.get(2)).toEqual({ available: false })
    expect(result.get(3)).toEqual({ available: true, title: 'PR 3' })
  })
})
