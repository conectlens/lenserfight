import { ARENA_BASE_URL, AUTH_BASE_URL, WEB_BASE_URL } from '@lenserfight/utils/env'

const PROD_ORIGINS = [
  WEB_BASE_URL,
  ARENA_BASE_URL,
  'https://arena.lenserfight.com',
  'https://admin.lenserfight.com',
]

const AUTH_ORIGINS = [new URL(`${AUTH_BASE_URL}/`).origin]

const LOCAL_DIRECT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
]

const LOCAL_PROXY_ORIGINS = [
  'http://web.localhost:8080',
  'http://arena.localhost:8080',
  'http://admin.localhost:8080',
]

const ALLOWED_ORIGINS = [...PROD_ORIGINS, ...LOCAL_DIRECT_ORIGINS, ...LOCAL_PROXY_ORIGINS]

export const DEFAULT_RETURN_URL = WEB_BASE_URL

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (typeof window !== 'undefined') {
    // Accept any origin on the same host as the current page so Tailscale/custom-host
    // dev setups work across apps (e.g. auth on :3004 accepting return URLs to web on :3000).
    try {
      const currentHost = new URL(window.location.origin).hostname
      const targetHost = new URL(origin).hostname
      if (currentHost === targetHost && currentHost !== 'localhost') return true
    } catch {
      // ignore
    }
  }
  return false
}

export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_RETURN_URL

  try {
    const parsed = new URL(url)
    if (AUTH_ORIGINS.includes(parsed.origin)) {
      return DEFAULT_RETURN_URL
    }

    if (isAllowedOrigin(parsed.origin)) {
      if (parsed.pathname === '/auth' || parsed.pathname.startsWith('/auth/')) {
        return DEFAULT_RETURN_URL
      }
      return parsed.toString()
    }
  } catch {
    // invalid URL — fall through to default
  }

  return DEFAULT_RETURN_URL
}

export function buildAuthReturnUrl(currentUrl: string, fallback = DEFAULT_RETURN_URL): string {
  try {
    const parsed = new URL(currentUrl)
    if (AUTH_ORIGINS.includes(parsed.origin)) {
      return sanitizeReturnUrl(parsed.searchParams.get('return_url'))
    }

    parsed.searchParams.delete('return_url')
    return sanitizeReturnUrl(parsed.toString())
  } catch {
    return fallback
  }
}

export function replaceLocationSafely(url: string): void {
  const target = new URL(url, window.location.origin).toString()
  if (target === window.location.href) return
  window.location.replace(target)
}
