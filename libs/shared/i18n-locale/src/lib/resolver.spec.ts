import { describe, expect, it } from 'vitest'
import { resolveInitialLocale } from './resolver'

describe('resolveInitialLocale', () => {
  it('prefers profileLocale over cookie, storage, and navigator', () => {
    expect(
      resolveInitialLocale({
        profileLocale: 'tr',
        cookieValue: 'en',
        storageValue: 'en',
        navigatorLanguage: 'en-US',
      }),
    ).toBe('tr')
  })

  it('falls back to cookie when profile is null', () => {
    expect(
      resolveInitialLocale({
        profileLocale: null,
        cookieValue: 'tr',
        storageValue: 'en',
        navigatorLanguage: 'en-US',
      }),
    ).toBe('tr')
  })

  it('falls back to storage when profile and cookie are missing', () => {
    expect(
      resolveInitialLocale({
        profileLocale: null,
        cookieValue: null,
        storageValue: 'tr',
        navigatorLanguage: 'en-US',
      }),
    ).toBe('tr')
  })

  it('derives locale from navigator language short code', () => {
    expect(
      resolveInitialLocale({
        profileLocale: null,
        cookieValue: null,
        storageValue: null,
        navigatorLanguage: 'tr-TR',
      }),
    ).toBe('tr')
  })

  it('returns DEFAULT_LOCALE when nothing matches', () => {
    expect(
      resolveInitialLocale({
        profileLocale: null,
        cookieValue: null,
        storageValue: null,
        navigatorLanguage: null,
      }),
    ).toBe('en')
  })

  it('rejects stub/disabled locales and falls through', () => {
    expect(
      resolveInitialLocale({
        profileLocale: 'ja',
        cookieValue: 'tr',
        storageValue: null,
        navigatorLanguage: null,
      }),
    ).toBe('tr')
  })

  it('rejects garbage strings and falls through', () => {
    expect(
      resolveInitialLocale({
        profileLocale: '',
        cookieValue: 'not-a-locale',
        storageValue: 'tr',
        navigatorLanguage: 'fr',
      }),
    ).toBe('tr')
  })

  it('treats undefined inputs the same as null', () => {
    expect(
      resolveInitialLocale({
        profileLocale: undefined,
        cookieValue: undefined,
        storageValue: undefined,
        navigatorLanguage: undefined,
      }),
    ).toBe('en')
  })
})
