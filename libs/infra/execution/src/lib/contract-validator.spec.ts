import { describe, it, expect } from 'vitest'

import { validateInputs, validateOutput } from './contract-validator'

import type { LensInputContract, LensOutputContract, NodeOutputEnvelope } from '@lenserfight/types'

/**
 * Covers Test Plan §2 Input / Output Contracts.
 * See docs/reference/workflows/test-plan.md.
 */

const textInputContract: LensInputContract = {
  kind: 'text',
  fields: {
    topic: { type: 'string', required: true, minLength: 3 },
    tone: { type: 'string', enum: ['neutral', 'playful', 'clinical'] },
    wordCount: { type: 'integer', min: 50, max: 2000 },
  },
}

const pdfOutputContract: LensOutputContract = {
  kind: 'pdf',
  artifactKind: 'pdf',
  schema: {
    pageCount: { type: 'integer', required: true, min: 1 },
  },
}

function envelope(overrides?: Partial<NodeOutputEnvelope>): NodeOutputEnvelope {
  return {
    kind: 'pdf',
    artifactKind: 'pdf',
    output: 'PDF ready',
    data: { pageCount: 3 },
    media: { url: 'blob:mock', mime: 'application/pdf' },
    ...overrides,
  }
}

describe('validateInputs — Test Plan 2.1', () => {
  it('reports missing_required when a required field is absent', () => {
    const result = validateInputs({}, textInputContract)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'topic', reason: 'missing_required' }),
    )
  })
})

describe('validateInputs — Test Plan 2.2', () => {
  it('reports type_mismatch when a field is the wrong type', () => {
    const result = validateInputs({ topic: 'hello', wordCount: '500' }, textInputContract)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'wordCount', reason: 'type_mismatch' }),
    )
  })

  it('rejects enum values outside the allowed list', () => {
    const result = validateInputs({ topic: 'hello', tone: 'snarky' }, textInputContract)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'tone', reason: 'enum_mismatch' }),
    )
  })

  it('passes when all required fields satisfy their schemas', () => {
    const result = validateInputs(
      { topic: 'The future of coffee', tone: 'neutral', wordCount: 600 },
      textInputContract,
    )
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })
})

describe('validateOutput — Test Plan 2.3 / 2.4', () => {
  it('reports output_contract_violation when a required data.* field is missing', () => {
    const result = validateOutput(envelope({ data: {} }), pdfOutputContract)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'data.pageCount', reason: 'missing_required' }),
    )
  })

  it('allows additive unknown fields (schema is not strict)', () => {
    const result = validateOutput(
      envelope({ data: { pageCount: 2, unlistedExtraField: 'still ok' } }),
      pdfOutputContract,
    )
    expect(result.ok).toBe(true)
  })

  it('rejects envelopes whose kind does not match the declared contract', () => {
    const result = validateOutput(
      envelope({ kind: 'image', artifactKind: 'image' }),
      pdfOutputContract,
    )
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.field === 'kind' && e.reason === 'enum_mismatch')).toBe(true)
  })

  it('rejects envelopes with missing required envelope fields', () => {
    const result = validateOutput(
      { kind: 'pdf', artifactKind: 'pdf', output: '' } as NodeOutputEnvelope,
      null,
    )
    expect(result.ok).toBe(false)
  })
})

describe('validateInputs — strict mode', () => {
  it('rejects unknown fields when contract.strict is true', () => {
    const strict: LensInputContract = { ...textInputContract, strict: true }
    const result = validateInputs({ topic: 'hi', rogueField: 1 }, strict)
    expect(result.errors.some((e) => e.reason === 'unknown_field')).toBe(true)
  })
})

describe('validateInputs — requireAnyOf', () => {
  it('fires missing_required when none of the alternatives are present', () => {
    const contract: LensInputContract = {
      kind: 'text',
      fields: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      requireAnyOf: [['a', 'b']],
    }
    const result = validateInputs({}, contract)
    expect(result.ok).toBe(false)
    expect(result.errors[0].reason).toBe('missing_required')
  })

  it('passes when at least one alternative is present', () => {
    const contract: LensInputContract = {
      kind: 'text',
      fields: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      requireAnyOf: [['a', 'b']],
    }
    const result = validateInputs({ a: 'yes' }, contract)
    expect(result.ok).toBe(true)
  })
})
