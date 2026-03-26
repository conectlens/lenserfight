const PROD_ORIGINS = [
  'https://forum.lenserfight.com',
  'https://arena.lenserfight.com',
  'https://admin.lenserfight.com',
]

const AUTH_ORIGINS = [
  'https://auth.lenserfight.com',
  'http://localhost:3004',
  'http://auth.localhost:8080',
]

const LOCAL_DIRECT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
]

const LOCAL_PROXY_ORIGINS = [
  'http://forum.localhost:8080',
  'http://arena.localhost:8080',
  'http://admin.localhost:8080',
]

const ALLOWED_ORIGINS = [...PROD_ORIGINS, ...LOCAL_DIRECT_ORIGINS, ...LOCAL_PROXY_ORIGINS]

export const DEFAULT_RETURN_URL =
  import.meta.env.VITE_WEB_BASE_URL ?? 'https://forum.lenserfight.com'

export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_RETURN_URL

  try {
    const parsed = new URL(url)
    if (AUTH_ORIGINS.includes(parsed.origin)) {
      return DEFAULT_RETURN_URL
    }

    if (ALLOWED_ORIGINS.includes(parsed.origin)) {
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
