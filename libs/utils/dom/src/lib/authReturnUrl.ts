import { LANDING_BASE_URL, AUTH_BASE_URL, WEB_BASE_URL } from '@lenserfight/utils/env'

const PROD_ORIGINS = [
  WEB_BASE_URL,
  LANDING_BASE_URL,
  'https://admin.lenserfight.win',
]

const AUTH_ORIGINS = [new URL(`${AUTH_BASE_URL}/`).origin]

const LOCAL_DIRECT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3004', // apps/auth dev server
]

const LOCAL_PROXY_ORIGINS = [
  'http://web.localhost:8080',
  'http://arena.localhost:8080',
  'http://admin.localhost:8080',
]

// Ports used by local app servers. When rewriting localhost ↔ IP, we preserve the port.
const LOCAL_APP_PORTS = new Set([3000, 3001, 3002, 3003, 3004, 8080])

const ALLOWED_ORIGINS = [...PROD_ORIGINS, ...LOCAL_DIRECT_ORIGINS, ...LOCAL_PROXY_ORIGINS]

export const DEFAULT_RETURN_URL = WEB_BASE_URL

const isIpAddress = (hostname: string): boolean =>
  /^[\d.]+$/.test(hostname) || hostname.includes(':')

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

/**
 * Rewrite the hostname of a return URL to match the current page's hostname
 * when one side is a bare IP and the other is localhost.
 *
 * In dev, apps may run on a Tailscale IP (e.g. 100.x.x.x) while the return
 * URL still says "localhost". Cookies are scoped to the hostname that wrote
 * them, so a cross-host redirect loses the session entirely. Rewriting the
 * hostname keeps the cookie domain consistent.
 *
 * Only applies to known local app ports — never rewrites production URLs.
 */
function rewriteHostIfCrossLocalHost(parsed: URL): URL {
  if (typeof window === 'undefined') return parsed
  try {
    const currentHostname = window.location.hostname
    const targetHostname = parsed.hostname
    const port = parsed.port ? parseInt(parsed.port, 10) : 80

    if (!LOCAL_APP_PORTS.has(port)) return parsed
    if (currentHostname === targetHostname) return parsed

    const currentIsIp = isIpAddress(currentHostname)
    const targetIsLocalhost = targetHostname === 'localhost' || targetHostname === '127.0.0.1'
    const targetIsIp = isIpAddress(targetHostname)
    const currentIsLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1'

    if ((currentIsIp && targetIsLocalhost) || (currentIsLocalhost && targetIsIp)) {
      const rewritten = new URL(parsed.toString())
      rewritten.hostname = currentHostname
      return rewritten
    }
  } catch {
    // ignore — return original
  }
  return parsed
}

const RELATIVE_PROBE_ORIGIN = 'http://relative.invalid'

/**
 * A relative return path must stay on the current origin once parsed. The URL
 * parser treats `\\` like `/` and drops tab/newline characters, so values such
 * as `/\\evil.example` or `/<TAB>/evil.example` would otherwise resolve to
 * another host; reject those characters and re-check the parsed origin.
 */
function isSameOriginPath(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//')) return false
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(url)) return false
  try {
    return new URL(url, RELATIVE_PROBE_ORIGIN).origin === RELATIVE_PROBE_ORIGIN
  } catch {
    return false
  }
}

export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_RETURN_URL

  // Allow relative paths — they stay within the current origin (same-app navigation).
  // A path like /device-approval?code=X&mode=login must survive the login redirect so
  // GatewayGuard can send the user back to DeviceApprovalPage after sign-in.
  if (url.startsWith('/')) {
    if (!isSameOriginPath(url)) return DEFAULT_RETURN_URL
    // Block /auth/* to prevent open-redirect loops back to the auth entry routes.
    if (url === '/auth' || url.startsWith('/auth/')) {
      return DEFAULT_RETURN_URL
    }
    return url
  }

  try {
    const parsed = new URL(url)
    if (AUTH_ORIGINS.includes(parsed.origin)) {
      return DEFAULT_RETURN_URL
    }

    const rewritten = rewriteHostIfCrossLocalHost(parsed)

    if (isAllowedOrigin(rewritten.origin)) {
      if (rewritten.pathname === '/auth' || rewritten.pathname.startsWith('/auth/')) {
        return DEFAULT_RETURN_URL
      }
      return rewritten.toString()
    }

    // Fallback: check the original origin too (e.g. if rewrite wasn't needed)
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
  let resolved: URL
  try {
    resolved = new URL(url, window.location.origin)
  } catch {
    resolved = new URL(DEFAULT_RETURN_URL)
  }
  const sameOrigin = resolved.origin === window.location.origin
  const trusted = sameOrigin || isAllowedOrigin(resolved.origin)
  if (!trusted || (resolved.protocol !== 'https:' && resolved.protocol !== 'http:')) {
    resolved = new URL(DEFAULT_RETURN_URL)
  }
  const target = resolved.toString()
  if (target === window.location.href) return
  window.location.replace(target)
}
