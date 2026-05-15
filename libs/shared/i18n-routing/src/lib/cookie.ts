// Local cookie helpers for the shared lf-locale cookie. Kept inline so this
// lib stays free of an inbound dep on @lenserfight/shared/i18n-locale.
// The cookie name and attributes mirror libs/shared/i18n-locale/cookie.ts.

const LOCALE_COOKIE_NAME = 'lf-locale'
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const isIpAddress = (hostname: string): boolean =>
  /^[\d.]+$/.test(hostname) || hostname.includes(':')

function getCookieDomain(hostname: string): string {
  if (!hostname) return ''
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname
  if (hostname.endsWith('.localhost')) return '.localhost'
  if (isIpAddress(hostname)) return hostname
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : hostname
}

function browserAvailable(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined'
}

export function readSharedLocaleCookie(): string | null {
  if (!browserAvailable()) return null
  const key = encodeURIComponent(LOCALE_COOKIE_NAME)
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function writeSharedLocaleCookie(code: string): void {
  if (!browserAvailable()) return
  const domain = getCookieDomain(window.location.hostname)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainAttr = domain ? `; Domain=${domain}` : ''
  document.cookie =
    `${encodeURIComponent(LOCALE_COOKIE_NAME)}=${encodeURIComponent(code)}` +
    `${domainAttr}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}
