// Production sub-app origins
const PROD_ORIGINS = [
  'https://forum.lenserfight.com',
  'https://arena.lenserfight.com',
  'https://admin.lenserfight.com',
]

// Direct Vite dev-server ports (no proxy)
const LOCAL_DIRECT_ORIGINS = [
  'http://localhost:3000', // forum
  'http://localhost:3001', // arena
  'http://localhost:3002', // admin
  'http://localhost:3004', // auth (self)
]

// Dev-proxy subdomain origins (*.localhost:8080)
const LOCAL_PROXY_ORIGINS = [
  'http://forum.localhost:8080',
  'http://arena.localhost:8080',
  'http://admin.localhost:8080',
  'http://auth.localhost:8080',
]

const ALLOWED_ORIGINS = [...PROD_ORIGINS, ...LOCAL_DIRECT_ORIGINS, ...LOCAL_PROXY_ORIGINS]

export const DEFAULT_RETURN_URL =
  import.meta.env.VITE_DEFAULT_RETURN_URL ?? 'https://forum.lenserfight.com'

export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_RETURN_URL
  try {
    const parsed = new URL(url)
    if (ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))) {
      // Reject /auth/* paths — they are forum-internal redirect routes, not content pages.
      // Returning to them causes an infinite redirect loop.
      if (parsed.pathname === '/auth' || parsed.pathname.startsWith('/auth/')) {
        return DEFAULT_RETURN_URL
      }
      return url
    }
  } catch {
    // invalid URL — fall through to default
  }
  return DEFAULT_RETURN_URL
}
