const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

/** True when the URL host is loopback or missing (relative). */
export function isLoopbackOrLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Replace origin of `signedUrl` with `publicBase` (no trailing slash). */
export function rewriteUrlOrigin(signedUrl: string, publicBase: string): string {
  const base = publicBase.replace(/\/$/, '')
  try {
    const signed = new URL(signedUrl)
    const pub = new URL(base)
    return `${pub.origin}${signed.pathname}${signed.search}`
  } catch {
    return signedUrl
  }
}

export function isDataUri(url: string): boolean {
  return url.startsWith('data:')
}

/** Parse `data:mime;base64,payload` → { mimeType, base64 }. */
export function parseDataUri(url: string): { mimeType: string; base64: string } | null {
  if (!isDataUri(url)) return null
  const match = /^data:([^;,]+)?(?:;base64)?,(.+)$/i.exec(url)
  if (!match) return null
  return { mimeType: match[1] || 'application/octet-stream', base64: match[2] }
}
