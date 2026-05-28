import { describe, expect, it } from 'vitest'

import { CONNECTOR_SCOPES, isConnectorScope, parseScopesCsv, validateScopes } from './scopes'

describe('scopes', () => {
  it('exposes the v1 12-scope grammar', () => {
    expect(CONNECTOR_SCOPES).toHaveLength(12)
    for (const scope of CONNECTOR_SCOPES) {
      expect(scope).toMatch(/^[a-z]+:(read|write)$/)
    }
  })

  it('isConnectorScope narrows correctly', () => {
    expect(isConnectorScope('lenses:read')).toBe(true)
    expect(isConnectorScope('battles:vote')).toBe(false)
    expect(isConnectorScope(42)).toBe(false)
    expect(isConnectorScope(undefined)).toBe(false)
  })

  it('validateScopes splits valid from invalid and trims whitespace', () => {
    const result = validateScopes(['  lenses:read  ', 'agents:write', 'invalid:scope', ''])
    expect(result.valid).toEqual(['lenses:read', 'agents:write'])
    expect(result.invalid).toEqual(['invalid:scope'])
  })

  it('parseScopesCsv handles comma-separated input', () => {
    const result = parseScopesCsv('lenses:read, threads:write, bogus')
    expect(result.valid).toEqual(['lenses:read', 'threads:write'])
    expect(result.invalid).toEqual(['bogus'])
  })
})
