const ALLOWED_ORIGINS = [
  'https://forum.lenserfight.com',
  'https://arena.lenserfight.com',
  'https://admin.lenserfight.com',
  // Local dev direct Vite ports
  'http://localhost:3000', // forum
  'http://localhost:3001', // arena
  'http://localhost:3002', // admin
]

const DEFAULT_RETURN_URL = 'https://forum.lenserfight.com'

export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_RETURN_URL
  try {
    new URL(url) // throws if invalid
    if (ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))) return url
  } catch {
    // invalid URL — fall through to default
  }
  return DEFAULT_RETURN_URL
}
