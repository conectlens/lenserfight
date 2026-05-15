import { isLocaleCode, type LocaleCode } from '@lenserfight/utils/locale'
import { LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME } from './constants'

const isIpAddress = (hostname: string): boolean =>
  /^[\d.]+$/.test(hostname) || hostname.includes(':')

export function getLocaleCookieDomain(hostname: string): string {
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

export function readLocaleCookie(): LocaleCode | null {
  if (!browserAvailable()) return null
  const key = encodeURIComponent(LOCALE_COOKIE_NAME)
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))
  if (!match) return null
  const raw = decodeURIComponent(match[1])
  return isLocaleCode(raw) ? raw : null
}

export function writeLocaleCookie(code: LocaleCode): void {
  if (!browserAvailable()) return
  if (!isLocaleCode(code)) return
  const domain = getLocaleCookieDomain(window.location.hostname)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainAttr = domain ? `; Domain=${domain}` : ''
  document.cookie =
    `${encodeURIComponent(LOCALE_COOKIE_NAME)}=${encodeURIComponent(code)}` +
    `${domainAttr}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function clearLocaleCookie(): void {
  if (!browserAvailable()) return
  const domain = getLocaleCookieDomain(window.location.hostname)
  const domainAttr = domain ? `; Domain=${domain}` : ''
  document.cookie =
    `${encodeURIComponent(LOCALE_COOKIE_NAME)}=${domainAttr}; Path=/; Max-Age=0; SameSite=Lax`
}
