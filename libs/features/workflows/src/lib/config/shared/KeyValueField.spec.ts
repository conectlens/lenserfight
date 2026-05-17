import { describe, expect, it } from 'vitest'

// Test the parse/serialize logic directly

interface KVPair { key: string; value: string }

function parsePairs(raw: string): KVPair[] {
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }))
    }
  } catch {
    // fall through
  }
  return []
}

function serializePairs(pairs: KVPair[]): string {
  const obj: Record<string, string> = {}
  for (const p of pairs) {
    if (p.key.trim()) obj[p.key] = p.value
  }
  if (Object.keys(obj).length === 0) return ''
  return JSON.stringify(obj, null, 2)
}

describe('KeyValueField parse/serialize', () => {
  describe('parsePairs', () => {
    it('parses JSON object', () => {
      const raw = '{"Authorization":"Bearer token","Content-Type":"application/json"}'
      const pairs = parsePairs(raw)
      expect(pairs).toEqual([
        { key: 'Authorization', value: 'Bearer token' },
        { key: 'Content-Type', value: 'application/json' },
      ])
    })

    it('returns empty for empty string', () => {
      expect(parsePairs('')).toEqual([])
    })

    it('returns empty for invalid JSON', () => {
      expect(parsePairs('not json')).toEqual([])
    })

    it('returns empty for JSON array', () => {
      expect(parsePairs('[1,2,3]')).toEqual([])
    })

    it('coerces non-string values', () => {
      expect(parsePairs('{"count":42,"active":true}')).toEqual([
        { key: 'count', value: '42' },
        { key: 'active', value: 'true' },
      ])
    })
  })

  describe('serializePairs', () => {
    it('serializes to JSON object', () => {
      const result = serializePairs([
        { key: 'X-Api-Key', value: '123' },
        { key: 'Accept', value: 'application/json' },
      ])
      const parsed = JSON.parse(result)
      expect(parsed).toEqual({ 'X-Api-Key': '123', Accept: 'application/json' })
    })

    it('returns empty for empty pairs', () => {
      expect(serializePairs([])).toBe('')
    })

    it('skips pairs with empty keys', () => {
      const result = serializePairs([
        { key: '', value: 'orphan' },
        { key: 'real', value: 'value' },
      ])
      expect(JSON.parse(result)).toEqual({ real: 'value' })
    })
  })

  describe('round-trip', () => {
    it('preserves data', () => {
      const original = [
        { key: 'p_lenser_id', value: '{{n1.lenserId}}' },
        { key: 'p_limit', value: '10' },
      ]
      const serialized = serializePairs(original)
      const deserialized = parsePairs(serialized)
      expect(deserialized).toEqual(original)
    })
  })
})
