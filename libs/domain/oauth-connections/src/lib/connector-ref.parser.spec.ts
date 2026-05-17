import { describe, it, expect } from 'vitest'
import { extractConnectorRefs, hasConnectorRef, parseConnectorRef } from './connector-ref.parser'

describe('parseConnectorRef', () => {
  it('parses a valid ref', () => {
    const result = parseConnectorRef('google.gmail.primary')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ref.provider).toBe('google')
    expect(result.ref.capability).toBe('gmail')
    expect(result.ref.label).toBe('primary')
    expect(result.ref.raw).toBe('google.gmail.primary')
  })

  it('parses all five Google capabilities', () => {
    for (const cap of ['gmail', 'drive', 'sheets', 'docs', 'calendar'] as const) {
      const result = parseConnectorRef(`google.${cap}.primary`)
      expect(result.ok, `capability ${cap} should parse ok`).toBe(true)
    }
  })

  it('parses a label with hyphens and underscores', () => {
    const result = parseConnectorRef('google.sheets.work-account_2')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ref.label).toBe('work-account_2')
  })

  it('parses a dotted label (multi-segment)', () => {
    // 'google.calendar.team.eng' → label = 'team.eng'
    const result = parseConnectorRef('google.calendar.team.eng')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ref.label).toBe('team.eng')
  })

  it('returns error for unknown provider', () => {
    const result = parseConnectorRef('github.sheets.primary')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/unknown provider/)
  })

  it('returns error for unknown capability', () => {
    const result = parseConnectorRef('google.unknown.primary')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/unknown capability/)
  })

  it('returns error for missing label segment', () => {
    const result = parseConnectorRef('google.gmail')
    expect(result.ok).toBe(false)
  })

  it('returns error for invalid label format (uppercase)', () => {
    const result = parseConnectorRef('google.gmail.Primary')
    expect(result.ok).toBe(false)
  })

  it('returns error for empty string', () => {
    const result = parseConnectorRef('')
    expect(result.ok).toBe(false)
  })

  it('returns error for label too long (> 48 chars)', () => {
    const longLabel = 'a'.repeat(49)
    const result = parseConnectorRef(`google.gmail.${longLabel}`)
    expect(result.ok).toBe(false)
  })
})

describe('extractConnectorRefs', () => {
  it('extracts a single connector ref from a template string', () => {
    const refs = extractConnectorRefs('Use [[:connector:google.gmail.primary]] to send.')
    expect(refs).toEqual(['google.gmail.primary'])
  })

  it('extracts multiple connector refs', () => {
    const refs = extractConnectorRefs(
      'From [[:connector:google.gmail.primary]] and also [[:connector:google.sheets.work]]',
    )
    expect(refs).toEqual(['google.gmail.primary', 'google.sheets.work'])
  })

  it('returns empty array when no refs present', () => {
    expect(extractConnectorRefs('No connectors here.')).toEqual([])
  })

  it('does not extract malformed tokens', () => {
    expect(extractConnectorRefs('[[:connector:]]')).toEqual([])
    expect(extractConnectorRefs('[[:connector: google.gmail.primary]]')).toEqual([])
  })
})

describe('hasConnectorRef', () => {
  it('returns true when a connector ref is present', () => {
    expect(hasConnectorRef('[[:connector:google.gmail.primary]]')).toBe(true)
  })

  it('returns false when no connector ref is present', () => {
    expect(hasConnectorRef('plain text')).toBe(false)
    expect(hasConnectorRef('[[some_var]]')).toBe(false)
  })
})
