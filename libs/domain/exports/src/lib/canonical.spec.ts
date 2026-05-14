import { describe, it, expect } from 'vitest'

import { canonicalize } from './canonical'

describe('canonicalize', () => {
  it('sorts object keys lexicographically', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
  })

  it('produces identical output regardless of insertion order', () => {
    const a = canonicalize({ z: { b: 1, a: 2 }, a: [3, 2, 1] })
    const b = canonicalize({ a: [3, 2, 1], z: { a: 2, b: 1 } })
    expect(a).toBe(b)
  })

  it('rejects NaN and Infinity (would not round-trip)', () => {
    expect(() => canonicalize({ x: NaN })).toThrow(/canonical JSON/)
    expect(() => canonicalize({ x: Number.POSITIVE_INFINITY })).toThrow(/canonical JSON/)
    expect(() => canonicalize({ x: Number.NEGATIVE_INFINITY })).toThrow(/canonical JSON/)
  })

  it('rejects bigint', () => {
    expect(() => canonicalize({ x: 1n })).toThrow(/bigint/)
  })

  it('drops undefined object values (JSON has no undefined)', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}')
  })

  it('serializes undefined array slots as null (matches JSON.stringify)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const arr = [1, , 3]
    expect(canonicalize(arr)).toBe('[1,null,3]')
  })

  it('normalizes strings to NFC', () => {
    const nfd = 'é' // "e" + combining acute
    const nfc = 'é'
    expect(canonicalize(nfd)).toBe(canonicalize(nfc))
  })

  it('serializes -0 as 0', () => {
    expect(canonicalize(-0)).toBe('0')
    expect(canonicalize(0)).toBe('0')
  })
})
