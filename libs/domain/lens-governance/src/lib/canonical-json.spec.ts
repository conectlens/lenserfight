import { describe, expect, it } from 'vitest'

import { canonicalJson } from './canonical-json'

describe('canonicalJson', () => {
  it('sorts keys lexicographically', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
  })

  it('sorts nested keys', () => {
    expect(canonicalJson({ b: { d: 1, c: 2 }, a: 1 })).toBe(
      '{"a":1,"b":{"c":2,"d":1}}',
    )
  })

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]')
  })

  it('omits undefined values', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}')
  })

  it('preserves null values', () => {
    expect(canonicalJson({ a: null, b: 1 })).toBe('{"a":null,"b":1}')
  })

  it('is deterministic for permuted inputs', () => {
    const a = canonicalJson({ inputs: [{ label: 'x', required: true }], name: 'L' })
    const b = canonicalJson({ name: 'L', inputs: [{ required: true, label: 'x' }] })
    expect(a).toBe(b)
  })

  it('handles primitives', () => {
    expect(canonicalJson('hi')).toBe('"hi"')
    expect(canonicalJson(42)).toBe('42')
    expect(canonicalJson(true)).toBe('true')
    expect(canonicalJson(null)).toBe('null')
  })
})
