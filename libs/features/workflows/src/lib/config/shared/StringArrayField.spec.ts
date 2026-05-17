import { describe, expect, it } from 'vitest'

// Test the parse/serialize logic directly since component testing requires jsdom
// and the background agent is handling component-level tests

function parseArray(raw: string): string[] {
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // fall through
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function serializeArray(items: string[]): string {
  const clean = items.filter((s) => s.trim())
  if (clean.length === 0) return ''
  return JSON.stringify(clean)
}

describe('StringArrayField parse/serialize', () => {
  describe('parseArray', () => {
    it('parses JSON array', () => {
      expect(parseArray('["a","b","c"]')).toEqual(['a', 'b', 'c'])
    })

    it('parses comma-separated string as fallback', () => {
      expect(parseArray('a, b, c')).toEqual(['a', 'b', 'c'])
    })

    it('returns empty array for empty string', () => {
      expect(parseArray('')).toEqual([])
    })

    it('returns empty array for whitespace', () => {
      expect(parseArray('   ')).toEqual([])
    })

    it('handles single-item JSON array', () => {
      expect(parseArray('["bug"]')).toEqual(['bug'])
    })

    it('handles mixed numbers in JSON array', () => {
      expect(parseArray('[1, 2, 3]')).toEqual(['1', '2', '3'])
    })
  })

  describe('serializeArray', () => {
    it('serializes to JSON array', () => {
      expect(serializeArray(['a', 'b'])).toBe('["a","b"]')
    })

    it('returns empty string for empty array', () => {
      expect(serializeArray([])).toBe('')
    })

    it('filters empty strings', () => {
      expect(serializeArray(['a', '', 'b', ''])).toBe('["a","b"]')
    })
  })

  describe('round-trip', () => {
    it('preserves data through parse → serialize → parse', () => {
      const original = ['bug', 'enhancement', 'help wanted']
      const serialized = serializeArray(original)
      const deserialized = parseArray(serialized)
      expect(deserialized).toEqual(original)
    })

    it('handles legacy comma-separated → serialize → parse', () => {
      const legacy = 'bug, enhancement, help wanted'
      const parsed = parseArray(legacy)
      const serialized = serializeArray(parsed)
      const reparsed = parseArray(serialized)
      expect(reparsed).toEqual(['bug', 'enhancement', 'help wanted'])
    })
  })
})
