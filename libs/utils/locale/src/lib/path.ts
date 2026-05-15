import { DEFAULT_LOCALE, type LocaleCode } from './locales'
import { isLocaleCode } from './guards'

export function normalizePath(pathname: string): string {
  if (!pathname) return '/'
  const trimmed = pathname.trim()
  if (!trimmed.startsWith('/')) return `/${trimmed}`
  return trimmed
}

export function getLocaleFromPath(pathname: string): LocaleCode | null {
  const segments = normalizePath(pathname).split('/').filter(Boolean)
  const first = segments[0]
  return first && isLocaleCode(first) ? first : null
}

export function stripLocale(pathname: string): string {
  const segments = normalizePath(pathname).split('/').filter(Boolean)
  if (segments.length === 0) return '/'
  if (isLocaleCode(segments[0])) {
    const rest = segments.slice(1).join('/')
    return rest ? `/${rest}` : '/'
  }
  return normalizePath(pathname)
}

export function withLocale(pathname: string, locale: LocaleCode): string {
  const stripped = stripLocale(pathname)
  if (stripped === '/' || stripped === '') return `/${locale}`
  return `/${locale}${stripped}`
}

export function localePath(locale: LocaleCode, path: string): string {
  return withLocale(path || '/', locale ?? DEFAULT_LOCALE)
}
