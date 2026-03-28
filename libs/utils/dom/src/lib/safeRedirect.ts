export interface SafeRedirectTarget {
  kind: 'internal' | 'external'
  url: string
}

export interface SafeRedirectOptions {
  baseOrigin?: string
  allowedExternalHosts?: Iterable<string>
}

const LEGACY_INTERNAL_PREFIX = '/app'

function normalizeInternalPathname(pathname: string): string {
  if (pathname === LEGACY_INTERNAL_PREFIX) return '/'
  if (pathname.startsWith(`${LEGACY_INTERNAL_PREFIX}/`)) {
    return pathname.slice(LEGACY_INTERNAL_PREFIX.length)
  }
  return pathname
}

function parseAllowedHosts(values: Iterable<string> = []): Set<string> {
  const hosts = new Set<string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed) hosts.add(trimmed)
  }
  return hosts
}

function getDefaultBaseOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://forum.lenserfight.com'
}

export function resolveSafeRedirectTarget(
  target: string | null | undefined,
  options: SafeRedirectOptions = {}
): SafeRedirectTarget | null {
  if (!target) return null

  const baseOrigin = options.baseOrigin ?? getDefaultBaseOrigin()
  const allowedExternalHosts = parseAllowedHosts(options.allowedExternalHosts)

  try {
    const parsed = new URL(target, baseOrigin)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    if (parsed.origin === baseOrigin) {
      return {
        kind: 'internal',
        url: `${normalizeInternalPathname(parsed.pathname)}${parsed.search}${parsed.hash}`,
      }
    }

    if (allowedExternalHosts.has(parsed.hostname) || allowedExternalHosts.has(parsed.host)) {
      return {
        kind: 'external',
        url: parsed.toString(),
      }
    }
  } catch {
    return null
  }

  return null
}
