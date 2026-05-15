import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useEffect } from 'react'
import i18next from 'i18next'
import { LocaleProvider } from './LocaleProvider'
import { useLocale } from './useLocale'
import { LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from './constants'

function Probe({ onMount }: { onMount?: (api: ReturnType<typeof useLocale>) => void }) {
  const api = useLocale()
  useEffect(() => {
    onMount?.(api)
  }, [api, onMount])
  return <span data-testid="locale">{api.locale}</span>
}

function clearAllCookies() {
  const all = document.cookie.split(';')
  for (const entry of all) {
    const eq = entry.indexOf('=')
    const name = (eq > -1 ? entry.slice(0, eq) : entry).trim()
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`
  }
}

describe('LocaleProvider', () => {
  beforeEach(() => {
    clearAllCookies()
    window.localStorage.clear()
    document.documentElement.lang = ''
    document.documentElement.dir = ''
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'localhost', protocol: 'http:' },
    })
    vi.spyOn(i18next, 'changeLanguage').mockResolvedValue(((key: string) => key) as never)
  })

  afterEach(() => {
    clearAllCookies()
    vi.restoreAllMocks()
  })

  it('seeds initial locale from cookie', () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=tr`
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId('locale').textContent).toBe('tr')
  })

  it('seeds initial locale from localStorage when cookie absent', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'tr')
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId('locale').textContent).toBe('tr')
  })

  it('authLocale overrides cookie', () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=en`
    render(
      <LocaleProvider authLocale="tr">
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId('locale').textContent).toBe('tr')
  })

  it('user-driven setLocale updates locale, DOM, and i18next', async () => {
    let api: ReturnType<typeof useLocale> | undefined
    render(
      <LocaleProvider>
        <Probe onMount={(a) => (api = a)} />
      </LocaleProvider>,
    )
    expect(screen.getByTestId('locale').textContent).toBe('en')
    await act(async () => {
      api?.setLocale('tr')
    })
    expect(screen.getByTestId('locale').textContent).toBe('tr')
    expect(document.documentElement.lang).toBe('tr')
    expect(document.documentElement.dir).toBe('ltr')
    expect(i18next.changeLanguage).toHaveBeenCalledWith('tr')
  })

  it('fires onLocaleChange with source=user on UI changes', async () => {
    const handler = vi.fn()
    let api: ReturnType<typeof useLocale> | undefined
    render(
      <LocaleProvider onLocaleChange={handler}>
        <Probe onMount={(a) => (api = a)} />
      </LocaleProvider>,
    )
    handler.mockClear()
    await act(async () => {
      api?.setLocale('tr')
    })
    expect(handler).toHaveBeenCalledWith('tr', 'en', 'user')
  })

  it('ignores unenabled locales passed to setLocale', async () => {
    let api: ReturnType<typeof useLocale> | undefined
    render(
      <LocaleProvider>
        <Probe onMount={(a) => (api = a)} />
      </LocaleProvider>,
    )
    await act(async () => {
      api?.setLocale('ja' as never)
    })
    expect(screen.getByTestId('locale').textContent).toBe('en')
  })
})
