import { describe, it, expect } from 'vitest'
import {
  CURRENT_API_VERSION,
  LENSERFIGHT_API_GROUP,
  SPEC_API_VERSIONS,
  parseApiVersion,
  validateApiVersion,
} from './api-version'

describe('api-version constants', () => {
  it('exports the correct group', () => {
    expect(LENSERFIGHT_API_GROUP).toBe('lenserfight.dev')
  })

  it('current version follows group/version format', () => {
    expect(CURRENT_API_VERSION).toMatch(/^lenserfight\.dev\/v\d/)
  })

  it('v1alpha1 is in the known versions list', () => {
    expect(SPEC_API_VERSIONS).toContain('v1alpha1')
  })
})

describe('parseApiVersion', () => {
  it('parses a valid current version', () => {
    const result = parseApiVersion('lenserfight.dev/v1alpha1')
    expect(result).not.toBeNull()
    expect(result?.group).toBe('lenserfight.dev')
    expect(result?.version).toBe('v1alpha1')
    expect(result?.isRecognized).toBe(true)
    expect(result?.isCurrent).toBe(true)
    expect(result?.isDeprecated).toBe(false)
  })

  it('returns null for empty string', () => {
    expect(parseApiVersion('')).toBeNull()
  })

  it('returns null for string with no slash', () => {
    expect(parseApiVersion('lenserfight.dev')).toBeNull()
  })

  it('returns null for leading slash', () => {
    expect(parseApiVersion('/v1alpha1')).toBeNull()
  })

  it('returns null for trailing slash', () => {
    expect(parseApiVersion('lenserfight.dev/')).toBeNull()
  })

  it('recognizes unknown groups as not recognized', () => {
    const result = parseApiVersion('example.com/v1')
    expect(result).not.toBeNull()
    expect(result?.isRecognized).toBe(false)
    expect(result?.isCurrent).toBe(false)
  })

  it('recognizes unknown versions in correct group as not recognized', () => {
    const result = parseApiVersion('lenserfight.dev/v99')
    expect(result).not.toBeNull()
    expect(result?.group).toBe('lenserfight.dev')
    expect(result?.isRecognized).toBe(false)
  })
})

describe('validateApiVersion', () => {
  it('returns valid for the current apiVersion string', () => {
    const result = validateApiVersion('lenserfight.dev/v1alpha1')
    expect(result.outcome).toBe('valid')
  })

  it('returns missing when apiVersion is undefined', () => {
    const result = validateApiVersion(undefined)
    expect(result.outcome).toBe('missing')
    expect(result.message).toContain('lf spec migrate')
  })

  it('returns missing when apiVersion is null', () => {
    const result = validateApiVersion(null)
    expect(result.outcome).toBe('missing')
  })

  it('returns malformed when apiVersion is a number', () => {
    const result = validateApiVersion(1)
    expect(result.outcome).toBe('malformed')
  })

  it('returns malformed when apiVersion has no slash', () => {
    const result = validateApiVersion('lenserfight.dev')
    expect(result.outcome).toBe('malformed')
  })

  it('returns unknown for unrecognized version string', () => {
    const result = validateApiVersion('lenserfight.dev/v99')
    expect(result.outcome).toBe('unknown')
    expect(result.message).toContain('v1alpha1')
  })

  it('returns unknown for wrong group', () => {
    const result = validateApiVersion('example.com/v1alpha1')
    expect(result.outcome).toBe('unknown')
  })
})
