import { isImmutableURL } from './parse-url'

export function normalizeCDNUrl(raw: string): string {
  if (!raw) return raw

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return raw
  }

  if (url.protocol === 'http:') {
    url.protocol = 'https:'
  }

  url.pathname = url.pathname
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '')

  const localeRe = /^\/[a-z]{2}(?:-[a-zA-Z0-9]+)?\//
  if (localeRe.test(url.pathname)) {
    url.pathname = url.pathname.replace(localeRe, '/')
  }

  if (isImmutableURL(url.toString())) {
    url.search = ''
  }

  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

export function normalizeToCacheKey(
  url: string,
  env: string,
): string | null {
  const normalized = normalizeCDNUrl(url)
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return null
  }
  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null
  const [category, identifier] = segments
  return `lf:${env}:${category}:${identifier}`
}
