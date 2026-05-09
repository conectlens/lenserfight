const REDACT_PATTERNS: RegExp[] = [
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  /[A-Za-z0-9_-]{40,}/,
]

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'apikey',
  'cookie',
  'set-cookie',
])

const SENSITIVE_PARAMS = new Set([
  'key',
  'token',
  'secret',
  'access_token',
  'api_key',
  'refresh_token',
  'apikey',
])

export function redact(value: string): string {
  for (const pattern of REDACT_PATTERNS) {
    if (pattern.test(value)) return '[REDACTED]'
  }
  return value
}

export function redactHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    result[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v
  }
  return result
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = '[REDACTED]'
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, '[REDACTED]')
      }
    }
    return parsed.toString()
  } catch {
    return url
  }
}
