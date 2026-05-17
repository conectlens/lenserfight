const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^0(?:\.0){0,3}$/,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/i,
  /^\[::1\]$/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
]

const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  '169.254.169.254',
  '100.100.100.200',
])

const SAFE_HEADER_NAMES = new Set([
  'accept',
  'content-type',
  'user-agent',
  'x-lenserfight-signature',
  'x-lenserfight-timestamp',
  'x-request-id',
])

export interface CustomHttpSafetyConfig {
  readonly allowlistedOrigins?: readonly string[]
  readonly allowlistedHosts?: readonly string[]
  readonly httpsOnly?: boolean
}

export type CustomHttpSafetyResult =
  | { readonly ok: true; readonly url: URL }
  | { readonly ok: false; readonly reason: string }

export function validateCustomHttpUrl(
  rawUrl: string,
  config: CustomHttpSafetyConfig,
): CustomHttpSafetyResult {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'invalid_url' }
  }

  if ((config.httpsOnly ?? true) && url.protocol !== 'https:') {
    return { ok: false, reason: 'https_required' }
  }

  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(hostname) || PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return { ok: false, reason: 'private_or_metadata_host_blocked' }
  }

  const origins = new Set(config.allowlistedOrigins ?? [])
  const hosts = new Set((config.allowlistedHosts ?? []).map((host) => host.toLowerCase()))
  if (origins.size === 0 && hosts.size === 0) {
    return { ok: false, reason: 'allowlist_required' }
  }
  if (!origins.has(url.origin) && !hosts.has(hostname)) {
    return { ok: false, reason: 'host_not_allowlisted' }
  }

  return { ok: true, url }
}

export function sanitizeCustomHttpHeaders(headers: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase()
    if (!SAFE_HEADER_NAMES.has(lower)) continue
    if (lower === 'content-type' && typeof value === 'string' && !value.includes('json')) continue
    if (typeof value === 'string') safe[name] = value
  }
  return safe
}

export function maskSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSensitiveFields)
  if (!value || typeof value !== 'object') return value

  const masked: Record<string, unknown> = {}
  for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|password|authorization|api[-_]?key|cookie/i.test(key)) {
      masked[key] = '[REDACTED]'
    } else {
      masked[key] = maskSensitiveFields(fieldValue)
    }
  }
  return masked
}
