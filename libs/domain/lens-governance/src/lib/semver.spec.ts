import { describe, expect, it } from 'vitest'

import {
  isSufficientBump,
  parseSemver,
  requiredSemverBump,
} from './semver'

import type { LensContractBody } from './lens-contract.types'
import type { ParameterContract } from './parameter-contract.types'

function body(overrides: Partial<LensContractBody> = {}): LensContractBody {
  return {
    spec_version: '1.0.0',
    lens_id: '00000000-0000-0000-0000-000000000000',
    version_id: '00000000-0000-0000-0000-000000000001',
    semver: '1.0.0',
    kind: 'lens',
    lens_kind: 'text',
    name: 'test',
    summary: 'test summary',
    inputs: [],
    outputs: [{ kind: 'text', artifactKind: 'summary' }],
    dependencies: [],
    capability_tags: [],
    required_scopes: [],
    ...overrides,
  }
}

function param(overrides: Partial<ParameterContract> = {}): ParameterContract {
  return {
    label: 'topic',
    tool_id: null,
    classification: 'public',
    kind: 'primitive',
    type: 'string',
    required: false,
    default: null,
    validation: null,
    scope: 'lens',
    overrideable_by: [],
    deprecation: null,
    ...overrides,
  }
}

describe('parseSemver', () => {
  it('parses release versions', () => {
    expect(parseSemver('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: undefined,
    })
  })
  it('parses prerelease versions', () => {
    expect(parseSemver('2.0.0-rc.1')).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: 'rc.1',
    })
  })
  it('rejects invalid', () => {
    expect(() => parseSemver('1.2')).toThrow()
    expect(() => parseSemver('v1.2.3')).toThrow()
  })
})

describe('requiredSemverBump', () => {
  it('returns none for identical bodies', () => {
    expect(requiredSemverBump(body(), body())).toBe('none')
  })

  it('returns patch for name/summary tweaks', () => {
    expect(
      requiredSemverBump(body({ name: 'a' }), body({ name: 'b' })),
    ).toBe('patch')
    expect(
      requiredSemverBump(body({ summary: 'a' }), body({ summary: 'b' })),
    ).toBe('patch')
  })

  it('returns minor for added optional param', () => {
    const prior = body()
    const next = body({ inputs: [param({ label: 'topic', required: false })] })
    expect(requiredSemverBump(prior, next)).toBe('minor')
  })

  it('returns minor for added required param with usable default', () => {
    const next = body({
      inputs: [
        param({
          label: 'topic',
          required: true,
          default: { kind: 'static', value: 'x' },
        }),
      ],
    })
    expect(requiredSemverBump(body(), next)).toBe('minor')
  })

  it('returns major for added required param without default', () => {
    const next = body({
      inputs: [param({ label: 'topic', required: true, default: null })],
    })
    expect(requiredSemverBump(body(), next)).toBe('major')
  })

  it('returns major for removed param', () => {
    const prior = body({ inputs: [param({ label: 'topic' })] })
    expect(requiredSemverBump(prior, body())).toBe('major')
  })

  it('returns major when tightening validation (maxLength reduced)', () => {
    const prior = body({
      inputs: [param({ validation: { maxLength: 1000 } })],
    })
    const next = body({
      inputs: [param({ validation: { maxLength: 500 } })],
    })
    expect(requiredSemverBump(prior, next)).toBe('major')
  })

  it('returns minor when loosening validation (maxLength increased)', () => {
    const prior = body({
      inputs: [param({ validation: { maxLength: 500 } })],
    })
    const next = body({
      inputs: [param({ validation: { maxLength: 1000 } })],
    })
    expect(requiredSemverBump(prior, next)).toBe('minor')
  })

  it('returns major when classification is escalated public→protected', () => {
    const prior = body({ inputs: [param({ classification: 'public' })] })
    const next  = body({ inputs: [param({ classification: 'protected' })] })
    expect(requiredSemverBump(prior, next)).toBe('major')
  })

  it('returns major when an output is removed', () => {
    const prior = body({
      outputs: [
        { kind: 'text', artifactKind: 'summary' },
        { kind: 'text', artifactKind: 'risks' },
      ],
    })
    const next = body({
      outputs: [{ kind: 'text', artifactKind: 'summary' }],
    })
    expect(requiredSemverBump(prior, next)).toBe('major')
  })

  it('returns minor when an output is added', () => {
    const prior = body()
    const next  = body({
      outputs: [
        { kind: 'text', artifactKind: 'summary' },
        { kind: 'text', artifactKind: 'extra' },
      ],
    })
    expect(requiredSemverBump(prior, next)).toBe('minor')
  })
})

describe('isSufficientBump', () => {
  it('accepts major bump when required', () => {
    expect(isSufficientBump('1.2.3', '2.0.0', 'major')).toBe(true)
  })
  it('rejects minor bump when major required', () => {
    expect(isSufficientBump('1.2.3', '1.3.0', 'major')).toBe(false)
  })
  it('accepts minor when minor required', () => {
    expect(isSufficientBump('1.2.3', '1.3.0', 'minor')).toBe(true)
  })
  it('rejects patch when minor required', () => {
    expect(isSufficientBump('1.2.3', '1.2.4', 'minor')).toBe(false)
  })
  it('accepts patch when patch required', () => {
    expect(isSufficientBump('1.2.3', '1.2.4', 'patch')).toBe(true)
  })
  it('accepts any bump when none required', () => {
    expect(isSufficientBump('1.2.3', '1.2.3', 'none')).toBe(true)
  })
})
