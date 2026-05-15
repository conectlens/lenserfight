import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  SUPPORTED_LOCALES,
  getLocale,
  getLocaleFromPath,
  getLocaleLabel,
  isLocaleCode,
  isLocaleEnabled,
  localePath,
  normalizePath,
  stripLocale,
  withLocale,
} from '../index'

describe('locales registry', () => {
  it('declares en as default', () => {
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('exposes en + tr as enabled', () => {
    expect(ENABLED_LOCALES).toEqual(['en', 'tr'])
  })

  it('keeps the broader 11-locale registry as supported', () => {
    expect(SUPPORTED_LOCALES).toEqual([
      'en', 'tr', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it',
    ])
  })

  it('returns native names via getLocaleLabel', () => {
    expect(getLocaleLabel('tr')).toBe('Türkçe')
    expect(getLocaleLabel('ja')).toBe('日本語')
  })

  it('returns full definitions via getLocale', () => {
    const tr = getLocale('tr')
    expect(tr.englishName).toBe('Turkish')
    expect(tr.direction).toBe('ltr')
    expect(tr.status).toBe('stable')
  })
})

describe('isLocaleCode', () => {
  it('accepts known codes', () => {
    expect(isLocaleCode('en')).toBe(true)
    expect(isLocaleCode('tr')).toBe(true)
    expect(isLocaleCode('zh')).toBe(true)
  })

  it('rejects unknown or malformed codes', () => {
    expect(isLocaleCode('xyz')).toBe(false)
    expect(isLocaleCode('')).toBe(false)
    expect(isLocaleCode('EN')).toBe(false)
    expect(isLocaleCode(undefined)).toBe(false)
    expect(isLocaleCode(null)).toBe(false)
    expect(isLocaleCode(42)).toBe(false)
  })
})

describe('isLocaleEnabled', () => {
  it('returns true for stable locales', () => {
    expect(isLocaleEnabled('en')).toBe(true)
    expect(isLocaleEnabled('tr')).toBe(true)
  })

  it('returns false for stub locales', () => {
    expect(isLocaleEnabled('es')).toBe(false)
    expect(isLocaleEnabled('fr')).toBe(false)
  })
})

describe('normalizePath', () => {
  it('returns root for empty input', () => {
    expect(normalizePath('')).toBe('/')
  })

  it('prepends slash when missing', () => {
    expect(normalizePath('about')).toBe('/about')
  })

  it('preserves valid paths', () => {
    expect(normalizePath('/en/about')).toBe('/en/about')
  })
})

describe('getLocaleFromPath', () => {
  it('extracts locale from prefixed path', () => {
    expect(getLocaleFromPath('/en/about')).toBe('en')
    expect(getLocaleFromPath('/tr/policies/terms')).toBe('tr')
  })

  it('returns null when no locale prefix', () => {
    expect(getLocaleFromPath('/about')).toBeNull()
    expect(getLocaleFromPath('/')).toBeNull()
    expect(getLocaleFromPath('')).toBeNull()
  })

  it('returns null for unknown first segment', () => {
    expect(getLocaleFromPath('/xyz/about')).toBeNull()
  })

  it('handles trailing slash', () => {
    expect(getLocaleFromPath('/en/')).toBe('en')
  })
})

describe('stripLocale', () => {
  it('removes locale prefix when present', () => {
    expect(stripLocale('/en/about')).toBe('/about')
    expect(stripLocale('/tr/policies/terms')).toBe('/policies/terms')
  })

  it('returns root when only locale present', () => {
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/en/')).toBe('/')
  })

  it('passes through paths without a locale prefix', () => {
    expect(stripLocale('/about')).toBe('/about')
    expect(stripLocale('/')).toBe('/')
  })

  it('does not strip unknown first segments', () => {
    expect(stripLocale('/xyz/about')).toBe('/xyz/about')
  })
})

describe('withLocale', () => {
  it('prefixes bare paths', () => {
    expect(withLocale('/about', 'tr')).toBe('/tr/about')
    expect(withLocale('/', 'en')).toBe('/en')
  })

  it('replaces existing locale prefix', () => {
    expect(withLocale('/en/about', 'tr')).toBe('/tr/about')
    expect(withLocale('/tr/policies/privacy', 'en')).toBe('/en/policies/privacy')
  })

  it('handles edge inputs', () => {
    expect(withLocale('', 'en')).toBe('/en')
    expect(withLocale('/en', 'tr')).toBe('/tr')
  })

  it('does not double-prefix', () => {
    expect(withLocale('/en/en/about', 'tr')).toBe('/tr/en/about')
  })
})

describe('localePath', () => {
  it('is an alias of withLocale that tolerates undefined locale', () => {
    expect(localePath('tr', '/about')).toBe('/tr/about')
    expect(localePath('en', '')).toBe('/en')
  })
})
