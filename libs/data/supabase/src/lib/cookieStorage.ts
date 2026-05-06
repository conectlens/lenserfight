/**
 * Cookie-based Supabase storage adapter.
 *
 * Stores the session token in cookies scoped to the shared parent domain
 * (.lenserfight.com) so all subdomains (arena, docs, etc.)
 * read/write the same session.
 *
 * Chunking: cookies are limited to ~4KB. Supabase sessions can exceed this,
 * so large values are split into multiple cookies and reassembled on read.
 *
 * Remember Me:
 *   true  → persistent cookies (Max-Age = 1 year)
 *   false → session cookies (cleared when browser closes)
 */

const PREF_KEY = 'lf_remember_me'
const CHUNK_SIZE = 3500 // chars — safely under the 4KB cookie size limit

const getRememberMe = (): boolean => {
  try {
    return localStorage.getItem(PREF_KEY) !== 'false'
  } catch {
    return true
  }
}

const isIpAddress = (hostname: string): boolean => /^[\d.]+$/.test(hostname) || hostname.includes(':')

const getCookieDomain = (): string => {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname
  if (hostname.endsWith('.localhost')) return '.localhost'
  // IP addresses (IPv4 like 100.88.x.x, IPv6) must be used verbatim —
  // a leading-dot domain like ".58.68" is invalid and browsers silently drop the cookie.
  if (isIpAddress(hostname)) return hostname
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : hostname
}

const getMaxAge = (): string =>
  getRememberMe() ? `; Max-Age=${60 * 60 * 24 * 365}` : ''

const getSecure = (): string =>
  window.location.protocol === 'https:' ? '; Secure' : ''

function writeCookie(name: string, value: string): void {
  const domain = getCookieDomain()
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Domain=${domain}${getMaxAge()}; Path=/; SameSite=Lax${getSecure()}`
}

function readCookie(name: string): string | null {
  const key = encodeURIComponent(name)
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function eraseCookie(name: string): void {
  const domain = getCookieDomain()
  document.cookie = `${encodeURIComponent(name)}=; Domain=${domain}; Max-Age=0; Path=/; SameSite=Lax`
}

const countKey = (key: string) => `${key}__n`
const chunkKey = (key: string, i: number) => `${key}__c${i}`

export const cookieStorage = {
  setRememberMe(value: boolean): void {
    try {
      localStorage.setItem(PREF_KEY, String(value))
    } catch {
      // storage unavailable — no-op
    }
  },

  getItem(key: string): string | null {
    const nStr = readCookie(countKey(key))
    if (nStr !== null) {
      const n = parseInt(nStr, 10)
      let result = ''
      for (let i = 0; i < n; i++) {
        const chunk = readCookie(chunkKey(key, i))
        if (chunk === null) return null
        result += chunk
      }
      return result
    }
    return readCookie(key)
  },

  setItem(key: string, value: string): void {
    this.removeItem(key)
    if (value.length <= CHUNK_SIZE) {
      writeCookie(key, value)
      return
    }
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE))
    }
    writeCookie(countKey(key), String(chunks.length))
    chunks.forEach((chunk, i) => writeCookie(chunkKey(key, i), chunk))
  },

  removeItem(key: string): void {
    const nStr = readCookie(countKey(key))
    if (nStr !== null) {
      const n = parseInt(nStr, 10)
      for (let i = 0; i < n; i++) eraseCookie(chunkKey(key, i))
      eraseCookie(countKey(key))
    }
    eraseCookie(key)
  },
}
