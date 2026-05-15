import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLocaleCookie,
  getLocaleCookieDomain,
  readLocaleCookie,
  writeLocaleCookie,
} from './cookie'
import { LOCALE_COOKIE_NAME } from './constants'

describe('getLocaleCookieDomain', () => {
  it.each([
    ['localhost', 'localhost'],
    ['127.0.0.1', '127.0.0.1'],
    ['app.localhost', '.localhost'],
    ['lenserfight.com', 'lenserfight.com'],
    ['app.lenserfight.com', '.lenserfight.com'],
    ['staging.app.lenserfight.com', '.lenserfight.com'],
    ['192.168.1.5', '192.168.1.5'],
    ['100.88.10.42', '100.88.10.42'],
    ['::1', '::1'],
  ])('maps %s to %s', (hostname, expected) => {
    expect(getLocaleCookieDomain(hostname)).toBe(expected)
  })

  it('returns empty string for empty hostname', () => {
    expect(getLocaleCookieDomain('')).toBe('')
  })
})

function clearAllCookies() {
  const all = document.cookie.split(';')
  for (const entry of all) {
    const eq = entry.indexOf('=')
    const name = (eq > -1 ? entry.slice(0, eq) : entry).trim()
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`
  }
}

describe('readLocaleCookie / writeLocaleCookie', () => {
  beforeEach(() => {
    clearAllCookies()
    // localhost hostname so jsdom doesn't silently drop cookies with a Domain attribute
    // that doesn't match the page URL.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'localhost', protocol: 'http:' },
    })
  })

  afterEach(() => {
    clearAllCookies()
  })

  it('returns null when no cookie present', () => {
    expect(readLocaleCookie()).toBeNull()
  })

  it('round-trips a valid locale code', () => {
    writeLocaleCookie('tr')
    expect(readLocaleCookie()).toBe('tr')
  })

  it('rejects garbage values written outside the API', () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=not-a-locale; Path=/`
    expect(readLocaleCookie()).toBeNull()
  })

  it('accepts a manually placed valid value', () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=tr; Path=/`
    expect(readLocaleCookie()).toBe('tr')
  })

  it('clearLocaleCookie expires the cookie', () => {
    writeLocaleCookie('tr')
    expect(readLocaleCookie()).toBe('tr')
    clearLocaleCookie()
    expect(readLocaleCookie()).toBeNull()
  })
})
