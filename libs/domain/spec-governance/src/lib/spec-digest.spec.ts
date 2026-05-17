import { describe, it, expect } from 'vitest'
import { computeSpecDigest, computeExecutionSeal } from './spec-digest'

describe('computeSpecDigest', () => {
  it('returns a 64-character hex string', () => {
    const digest = computeSpecDigest({ kind: 'lens', name: 'Test' })
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input, same output', () => {
    const fm = { kind: 'lens', id: 'lens_test', name: 'Test Lens', version: '0.1.0' }
    expect(computeSpecDigest(fm)).toBe(computeSpecDigest(fm))
  })

  it('is stable — independent of JS object key insertion order', () => {
    const a = computeSpecDigest({ kind: 'lens', name: 'Test', version: '0.1.0' })
    const b = computeSpecDigest({ version: '0.1.0', name: 'Test', kind: 'lens' })
    expect(a).toBe(b)
  })

  it('produces different digests for different inputs', () => {
    const a = computeSpecDigest({ kind: 'lens', name: 'Lens A' })
    const b = computeSpecDigest({ kind: 'lens', name: 'Lens B' })
    expect(a).not.toBe(b)
  })

  it('ignores undefined/null values when computing the canonical form', () => {
    const a = computeSpecDigest({ kind: 'lens', name: 'Test', owner: undefined })
    const b = computeSpecDigest({ kind: 'lens', name: 'Test' })
    // Both should be equal since undefined values are excluded from canonical form
    expect(a).toBe(b)
  })

  it('produces a consistent digest for a realistic lens frontmatter', () => {
    const fm = {
      apiVersion: 'lenserfight.dev/v1alpha1',
      kind: 'lens',
      schema_version: 1,
      id: 'lens_code_reviewer',
      slug: 'code-reviewer',
      name: 'Code Reviewer',
      description: 'Review a diff for correctness, security, tests, maintainability.',
      version: '0.1.0',
      visibility: 'public',
      status: 'active',
    }
    const digest = computeSpecDigest(fm)
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    // Digest should be stable across invocations
    expect(computeSpecDigest(fm)).toBe(digest)
  })
})

describe('computeExecutionSeal', () => {
  it('returns a 64-character hex string', () => {
    const seal = computeExecutionSeal('a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64))
    expect(seal).toMatch(/^[0-9a-f]{64}$/)
  })

  it('changes when specContentHash changes', () => {
    const input = 'b'.repeat(64)
    const output = 'c'.repeat(64)
    const seal1 = computeExecutionSeal('a'.repeat(64), input, output)
    const seal2 = computeExecutionSeal('d'.repeat(64), input, output)
    expect(seal1).not.toBe(seal2)
  })

  it('changes when inputHash changes', () => {
    const spec = 'a'.repeat(64)
    const output = 'c'.repeat(64)
    expect(computeExecutionSeal(spec, 'b'.repeat(64), output)).not.toBe(
      computeExecutionSeal(spec, 'e'.repeat(64), output)
    )
  })

  it('changes when outputHash changes', () => {
    const spec = 'a'.repeat(64)
    const input = 'b'.repeat(64)
    expect(computeExecutionSeal(spec, input, 'c'.repeat(64))).not.toBe(
      computeExecutionSeal(spec, input, 'f'.repeat(64))
    )
  })

  it('is deterministic', () => {
    const spec = 'a'.repeat(64)
    const input = 'b'.repeat(64)
    const output = 'c'.repeat(64)
    expect(computeExecutionSeal(spec, input, output)).toBe(
      computeExecutionSeal(spec, input, output)
    )
  })
})
