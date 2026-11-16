/**
 * Selection of the MCP server that receives the signed-in user's session
 * during consent, and validation of the redirect target it returns.
 */

const DEV_ALLOWED_HOSTS = ['localhost', '127.0.0.1']
const DEV_TUNNEL_PATTERNS = [
  /\.ngrok-free\.app$/,
  /\.ngrok-free\.dev$/,
  /\.ngrok\.io$/,
  /\.trycloudflare\.com$/,
]

export interface McpServerUrlOptions {
  /** The configured MCP server origin (always allowed). */
  configured: string
  /** Development builds may additionally target loopback and tunnel hosts. */
  isDev: boolean
}

/**
 * Returns the base URL the consent page may talk to. The `server` query
 * parameter is attacker-controllable, so outside development it can only
 * select the configured origin; development builds may also select loopback
 * and tunnel hosts for local testing.
 */
export function resolveMcpServerUrl(
  serverParam: string | null,
  { configured, isDev }: McpServerUrlOptions
): string {
  if (!serverParam) return configured
  try {
    const u = new URL(serverParam)
    if (u.origin === new URL(configured).origin) return configured
    if (!isDev) return configured
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return configured
    if (u.username || u.password) return configured
    if (DEV_ALLOWED_HOSTS.includes(u.hostname)) return serverParam
    if (u.protocol === 'https:' && DEV_TUNNEL_PATTERNS.some((re) => re.test(u.hostname))) {
      return serverParam
    }
  } catch {
    // invalid URL
  }
  return configured
}

/** True for tunnel hosts that need the interstitial-skip header (dev only). */
export function isTunnelUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return DEV_TUNNEL_PATTERNS.some((re) => re.test(host))
  } catch {
    return false
  }
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Whether the page may navigate to `url` after a successful authorization.
 * Allows https, http on loopback only, and app-specific custom schemes that
 * MCP desktop clients register. Schemes that execute or embed content
 * (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`, `about:`) are rejected.
 */
export function isSafeRedirectTarget(url: URL): boolean {
  switch (url.protocol) {
    case 'https:':
      return true
    case 'http:':
      return LOOPBACK_HOSTS.has(url.hostname)
    case 'javascript:':
    case 'data:':
    case 'vbscript:':
    case 'blob:':
    case 'file:':
    case 'about:':
    case 'ws:':
    case 'wss:':
    case 'ftp:':
    case 'ms-msdt:':
    case 'search-ms:':
    case 'search:':
    case 'intent:':
    case 'chrome:':
    case 'shell:':
    case 'view-source:':
      return false
    case 'cursor:':
    case 'vscode:':
    case 'vscode-insiders:':
    case 'windsurf:':
      return true
    default:
      // Other app schemes must be reverse-DNS style (contain a dot).
      return /^[a-z][a-z0-9+-]*(\.[a-z0-9+-]+)+:$/.test(url.protocol)
  }
}
