import { describe, expect, it } from 'vitest'

import { buildStorageObjectFileName, sanitizeStoragePathSegment } from './storageObjectKey'

/** Characters that break a storage object key between signing and upload. */
const UNSAFE = /[^a-z0-9._\-/]/

describe('sanitizeStoragePathSegment', () => {
  it('lowercases and replaces whitespace with a single dash', () => {
    expect(sanitizeStoragePathSegment('Start To Fight')).toBe('start-to-fight')
    expect(sanitizeStoragePathSegment('a   b')).toBe('a-b')
  })

  it('collapses runs of replaced characters and trims dashes from the ends', () => {
    expect(sanitizeStoragePathSegment('!!!hello???world!!!')).toBe('hello-world')
  })

  it('keeps dots, underscores and dashes', () => {
    expect(sanitizeStoragePathSegment('my_file-v1.2')).toBe('my_file-v1.2')
  })

  it('falls back to "file" when nothing survives', () => {
    expect(sanitizeStoragePathSegment('!!!')).toBe('file')
    expect(sanitizeStoragePathSegment('   ')).toBe('file')
    expect(sanitizeStoragePathSegment('')).toBe('file')
  })
})

describe('buildStorageObjectFileName', () => {
  it('handles the filename from the original report', () => {
    // "Start to Fight!'.jpg" — spaces, "!", and U+2019 RIGHT SINGLE QUOTATION MARK.
    const result = buildStorageObjectFileName('Start to Fight!’.jpg', 1786065462607)

    expect(result).toBe('1786065462607-start-to-fight.jpg')
    expect(result).not.toMatch(UNSAFE)
  })

  it('preserves the extension while sanitizing the stem', () => {
    expect(buildStorageObjectFileName('Screen Shot 2026-08-10.PNG')).toBe(
      'screen-shot-2026-08-10.png',
    )
  })

  it('sanitizes a non-ascii extension too, not just the stem', () => {
    expect(buildStorageObjectFileName('report.jpé')).toBe('report.jp')
  })

  it('strips a directory prefix so the key cannot gain a path separator', () => {
    const result = buildStorageObjectFileName('some/nested\\dir/photo one.jpg')

    expect(result).toBe('photo-one.jpg')
    expect(result).not.toContain('/')
    expect(result).not.toContain('\\')
  })

  it('treats a leading dot as part of the name, not an extension separator', () => {
    expect(buildStorageObjectFileName('.env')).toBe('.env')
  })

  it('keeps a name with no extension', () => {
    expect(buildStorageObjectFileName('My Notes')).toBe('my-notes')
  })

  it('sanitizes the prefix as well', () => {
    expect(buildStorageObjectFileName('a.txt', 'User Upload!')).toBe('user-upload-a.txt')
  })

  it('omits the prefix separator when no prefix is given', () => {
    expect(buildStorageObjectFileName('a.txt')).toBe('a.txt')
  })

  it('never emits a character that is unsafe in an object key', () => {
    const names = [
      'Ünïcodé Ñame (final).JPEG',
      '   leading and trailing   .png',
      '💥 emoji 💥.gif',
      'a'.repeat(50) + ' b.webp',
      '!!!.jpg',
    ]

    for (const name of names) {
      expect(buildStorageObjectFileName(name, Date.now())).not.toMatch(UNSAFE)
    }
  })

  it('still produces a usable name when the stem is entirely unsafe', () => {
    expect(buildStorageObjectFileName('💥.gif')).toBe('file.gif')
  })
})
