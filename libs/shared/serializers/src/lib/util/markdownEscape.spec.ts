import { describe, it, expect } from 'vitest'

import { escapeMarkdown, escapeYamlString, stripHtml, yamlScalar } from './markdownEscape'

// ── yamlScalar ────────────────────────────────────────────────────────────────

describe('yamlScalar', () => {
  it('renders null as null', () => {
    expect(yamlScalar(null)).toBe('null')
  })

  // REGRESSION: JSON.stringify(undefined) === undefined, not the string "undefined".
  // Previously this caused: escapeYamlString(undefined) → undefined.replace() →
  // TypeError: value.replace is not a function.
  it('renders undefined as null (regression: JSON.stringify(undefined) === undefined)', () => {
    expect(yamlScalar(undefined)).toBe('null')
  })

  it('renders true/false as YAML booleans', () => {
    expect(yamlScalar(true)).toBe('true')
    expect(yamlScalar(false)).toBe('false')
  })

  it('renders finite numbers', () => {
    expect(yamlScalar(42)).toBe('42')
    expect(yamlScalar(3.14)).toBe('3.14')
    expect(yamlScalar(0)).toBe('0')
  })

  it('renders non-finite numbers as null', () => {
    expect(yamlScalar(Infinity)).toBe('null')
    expect(yamlScalar(-Infinity)).toBe('null')
    expect(yamlScalar(NaN)).toBe('null')
  })

  it('quotes and escapes strings', () => {
    expect(yamlScalar('hello')).toBe('"hello"')
    expect(yamlScalar('say "hi"')).toBe('"say \\"hi\\""')
    expect(yamlScalar('back\\slash')).toBe('"back\\\\slash"')
  })

  it('strips control characters from strings', () => {
    expect(yamlScalar('bad\x00char')).toBe('"badchar"')
    expect(yamlScalar('line\nnewline')).toBe('"linenewline"')
  })

  it('serializes plain objects via JSON (keys are escaped inside the YAML scalar)', () => {
    const result = yamlScalar({ a: 1, b: 'two' })
    // The JSON is YAML-escaped: double-quotes become \", so the outer scalar is
    // a quoted YAML string containing the JSON representation.
    expect(result).toMatch(/^".*"$/)
    expect(result).toContain('\\"a\\"')
    expect(result).toContain('\\"b\\"')
  })

  it('renders functions as null (JSON.stringify(fn) === undefined)', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(yamlScalar(() => {})).toBe('null')
  })
})

// ── escapeYamlString ──────────────────────────────────────────────────────────

describe('escapeYamlString', () => {
  it('wraps in double quotes', () => {
    expect(escapeYamlString('hello')).toBe('"hello"')
  })

  it('escapes embedded double quotes', () => {
    expect(escapeYamlString('say "hi"')).toBe('"say \\"hi\\""')
  })

  it('escapes backslashes', () => {
    expect(escapeYamlString('a\\b')).toBe('"a\\\\b"')
  })

  it('strips control characters', () => {
    expect(escapeYamlString('a\x00b\x1fc')).toBe('"abc"')
  })

  // REGRESSION: non-string values reaching escapeYamlString caused
  // TypeError: value.replace is not a function
  it('does not throw when given null (runtime safety)', () => {
    expect(() => escapeYamlString(null as unknown as string)).not.toThrow()
  })

  it('does not throw when given undefined (runtime safety)', () => {
    expect(() => escapeYamlString(undefined as unknown as string)).not.toThrow()
  })

  it('does not throw when given an object (runtime safety)', () => {
    expect(() => escapeYamlString({} as unknown as string)).not.toThrow()
  })
})

// ── escapeMarkdown ────────────────────────────────────────────────────────────

describe('escapeMarkdown', () => {
  it('passes through clean strings', () => {
    expect(escapeMarkdown('hello world')).toBe('hello world')
  })

  it('keeps tab, newline, carriage return', () => {
    expect(escapeMarkdown('a\tb\nc\r')).toBe('a\tb\nc\r')
  })

  it('strips non-printable control chars', () => {
    expect(escapeMarkdown('a\x00b\x08c')).toBe('abc')
  })

  // REGRESSION: null/object tags from Supabase payload caused
  // TypeError: value.replace is not a function
  it('does not throw when given null (runtime safety)', () => {
    expect(() => escapeMarkdown(null as unknown as string)).not.toThrow()
    expect(escapeMarkdown(null as unknown as string)).toBe('')
  })

  it('does not throw when given undefined (runtime safety)', () => {
    expect(() => escapeMarkdown(undefined as unknown as string)).not.toThrow()
    expect(escapeMarkdown(undefined as unknown as string)).toBe('')
  })

  it('does not throw when given an object (runtime safety)', () => {
    expect(() => escapeMarkdown({ name: 'tag' } as unknown as string)).not.toThrow()
  })

  it('does not throw when given a number (runtime safety)', () => {
    expect(() => escapeMarkdown(42 as unknown as string)).not.toThrow()
  })
})

// ── stripHtml ─────────────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes HTML tags but keeps their text content', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold')
    // stripHtml removes tag delimiters; script content is kept (not eval'd in MD).
    expect(stripHtml('<script>alert(1)</script>ok')).toBe('alert(1)ok')
  })

  it('removes HTML comments', () => {
    expect(stripHtml('<!-- comment -->text')).toBe('text')
  })

  it('passes through plain text', () => {
    expect(stripHtml('hello world')).toBe('hello world')
  })

  // REGRESSION: same runtime safety as escapeMarkdown
  it('does not throw when given null (runtime safety)', () => {
    expect(() => stripHtml(null as unknown as string)).not.toThrow()
    expect(stripHtml(null as unknown as string)).toBe('')
  })

  it('does not throw when given undefined (runtime safety)', () => {
    expect(() => stripHtml(undefined as unknown as string)).not.toThrow()
    expect(stripHtml(undefined as unknown as string)).toBe('')
  })
})

// ── end-to-end crash reproduction ─────────────────────────────────────────────

describe('crash reproductions', () => {
  it('yamlScalar(undefined) does not throw — primary crash path', () => {
    // Before the fix: JSON.stringify(undefined) === undefined, causing
    // escapeYamlString(undefined) → undefined.replace() → TypeError
    expect(() => yamlScalar(undefined)).not.toThrow()
  })

  it('escapeMarkdown on tag objects from Supabase join — secondary crash path', () => {
    // Before the fix: tags from Supabase can be [{id, name}] instead of [string],
    // causing escapeMarkdown(obj) → obj.replace() → TypeError
    const tagObject = { id: 1, name: 'cool-tag', slug: 'cool-tag' }
    expect(() => escapeMarkdown(tagObject as unknown as string)).not.toThrow()
  })
})
