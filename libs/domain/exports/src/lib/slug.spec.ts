import { describe, it, expect } from 'vitest'

import { ExportPathTraversalError } from './errors'
import {
  buildExportFilename,
  formatExtension,
  safeJoinWithinRoot,
  sanitizeSlug,
} from './slug'

describe('sanitizeSlug', () => {
  it('lowercases and replaces non-alphanumerics with dashes', () => {
    expect(sanitizeSlug('Hello World!')).toBe('hello-world')
  })

  it('strips leading/trailing dashes and dots', () => {
    expect(sanitizeSlug('...weird--name-')).toBe('weird-name')
  })

  it('rejects empty result', () => {
    expect(() => sanitizeSlug('////')).toThrow()
    expect(() => sanitizeSlug('')).toThrow()
  })

  it('caps to 80 chars', () => {
    const long = 'a'.repeat(200)
    expect(sanitizeSlug(long)).toHaveLength(80)
  })

  it('handles Windows-reserved names', () => {
    expect(sanitizeSlug('CON')).toBe('con-file')
    expect(sanitizeSlug('com1')).toBe('com1-file')
    expect(sanitizeSlug('nul')).toBe('nul-file')
  })

  it('blocks homoglyph / non-ASCII traversal attempts', () => {
    expect(sanitizeSlug('‮..‭etc')).toMatch(/^[a-z0-9-]+$/)
  })

  it('does NOT contain path separators after sanitization', () => {
    expect(sanitizeSlug('../../etc/passwd')).not.toMatch(/[/\\]/)
    expect(sanitizeSlug('..\\..\\windows')).not.toMatch(/[/\\]/)
  })

  it('rejects null bytes by replacement', () => {
    expect(sanitizeSlug('foo\0bar')).toBe('foo-bar')
  })
})

describe('formatExtension', () => {
  it.each([
    ['markdown', 'md'],
    ['json', 'json'],
    ['yaml', 'yaml'],
  ])('maps %s → %s', (fmt, ext) => {
    expect(formatExtension(fmt)).toBe(ext)
  })

  it('throws on unknown format', () => {
    expect(() => formatExtension('xml')).toThrow(/unsupported/)
  })
})

describe('buildExportFilename', () => {
  it('produces <slug>--<ISO-basic-UTC>--<6char-id>.<ext>', () => {
    const name = buildExportFilename({
      slug: 'My Battle',
      format: 'json',
      date: new Date('2026-05-14T19:30:45Z'),
    })
    expect(name).toMatch(/^my-battle--20260514T193045Z--[a-z2-7]{6}\.json$/)
  })
})

describe('safeJoinWithinRoot', () => {
  it('joins simple relative paths', () => {
    expect(safeJoinWithinRoot('/ws', 'exports/battle.md')).toBe('/ws/exports/battle.md')
  })

  it('rejects paths that escape via ..', () => {
    expect(() => safeJoinWithinRoot('/ws', '../etc/passwd')).toThrow(ExportPathTraversalError)
    expect(() => safeJoinWithinRoot('/ws', 'a/../../b')).toThrow(ExportPathTraversalError)
  })

  it('rejects paths containing null bytes', () => {
    expect(() => safeJoinWithinRoot('/ws', 'foo\0bar')).toThrow(ExportPathTraversalError)
  })

  it('normalizes redundant separators and dot segments', () => {
    expect(safeJoinWithinRoot('/ws', './exports///battle.md')).toBe('/ws/exports/battle.md')
  })

  it('handles backslash separators (Windows-style input)', () => {
    expect(safeJoinWithinRoot('/ws', 'exports\\battle.md')).toBe('/ws/exports/battle.md')
  })

  it('rejects empty relative path', () => {
    expect(() => safeJoinWithinRoot('/ws', '')).toThrow(ExportPathTraversalError)
    expect(() => safeJoinWithinRoot('/ws', './')).toThrow(ExportPathTraversalError)
  })
})
