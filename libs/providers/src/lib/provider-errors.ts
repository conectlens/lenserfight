/**
 * Canonical provider-error model.
 *
 * Adapters wrap raw HTTP failures into `ProviderError` so callers (UI, CLI,
 * execution engine) can branch on `code` instead of regex-matching English
 * strings. The `kind` field drives UI retry / fallback decisions; `retriable`
 * tells the execution layer whether an automatic retry is safe.
 *
 * GRASP — *Pure Fabrication* + *Information Expert*. This type owns the
 * provider-error vocabulary so every adapter funnels error mapping through a
 * single seam instead of formatting strings ad-hoc at the call site.
 */

export type ProviderErrorCode =
  | 'auth_failed'        // 401 — bad key, expired key
  | 'permission_denied'  // 403 — key valid but no access to model/endpoint
  | 'not_found'          // 404 — typically a non-existent model
  | 'invalid_request'    // 400 — malformed body / unsupported param / wrong size
  | 'unsupported_model'  // 400 — adapter rejects this model name pre-flight
  | 'content_policy'     // 400 — provider safety filter
  | 'rate_limited'       // 429
  | 'quota_exceeded'     // 402 / billing
  | 'timeout'            // 408 / network timeout
  | 'server_error'       // 5xx
  | 'unknown'            // anything not mapped

const RETRIABLE_CODES = new Set<ProviderErrorCode>(['rate_limited', 'timeout', 'server_error'])

export interface ProviderErrorOptions {
  /** Canonical machine code. */
  code: ProviderErrorCode
  /** Short, user-safe message. Never leaks API keys, IDs, or stack traces. */
  message: string
  /** Provider name for the toast / telemetry. */
  provider: string
  /** Model the failure was bound to, if known. */
  model?: string
  /** Underlying HTTP status, if any. */
  status?: number
  /** Provider-side error code (e.g. "content_policy_violation"). */
  providerCode?: string
  /** Raw response excerpt — capped at 200 chars, key material stripped. */
  rawBody?: string
  /** Operator-facing correlation id (shown to user as short opaque code). */
  traceId?: string
  /** Seconds the caller should wait before retrying (from `Retry-After` header). */
  retryAfterSeconds?: number
}

/**
 * Generate a short opaque trace id. 12 chars of base36 from random bytes;
 * collision-resistant enough for human bug reports while staying readable.
 */
function newTraceId(): string {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (const b of bytes) out += b.toString(36).padStart(2, '0')
  return `lf-${out.slice(0, 12)}`
}

export class ProviderError extends Error {
  readonly code: ProviderErrorCode
  readonly provider: string
  readonly model?: string
  readonly status?: number
  readonly providerCode?: string
  readonly rawBody?: string
  readonly retriable: boolean
  /** Short id shown to the user; logged with the full body on the server. */
  readonly traceId: string
  /** Honour-as-best-effort hint for retry delay (from `Retry-After`). */
  readonly retryAfterSeconds?: number

  constructor(opts: ProviderErrorOptions) {
    super(opts.message)
    this.name = 'ProviderError'
    this.code = opts.code
    this.provider = opts.provider
    this.model = opts.model
    this.status = opts.status
    this.providerCode = opts.providerCode
    this.rawBody = opts.rawBody
    this.retriable = RETRIABLE_CODES.has(opts.code)
    this.traceId = opts.traceId ?? newTraceId()
    this.retryAfterSeconds = opts.retryAfterSeconds
  }

  /**
   * Format a user-safe one-liner with the trace id appended so support / on-call
   * can correlate a screenshot to a server-side log line.
   */
  toUserString(): string {
    return `${this.message} (ref: ${this.traceId})`
  }
}

/** Strip bearer tokens / api keys before propagating an excerpt. */
function sanitize(body: string): string {
  return body
    .replace(/sk-[a-zA-Z0-9_-]{16,}/g, 'sk-***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ***')
    .slice(0, 200)
}

interface MapOptions {
  provider: string
  model?: string
  /** Hint for unauthenticated/auth-failed customization. */
  authFailedMessage?: string
  /** Hint for 404 customization. */
  notFoundMessage?: string
}

/**
 * Map an HTTP response into a {@link ProviderError}. Reads the response body
 * exactly once; the caller MUST NOT consume it themselves first.
 *
 * Tries to extract provider-specific structured error fields when available
 * (`error.code`, `error.type`, `error.message`).
 */
export async function mapHttpError(res: Response, opts: MapOptions): Promise<ProviderError> {
  const text = await res.text().catch(() => '')
  const rawBody = sanitize(text)

  // Extracting a string provider-code reliably is provider-shape-sensitive:
  //
  //   Google AI Studio / Vertex
  //     { error: { code: 403, message: "...", status: "PERMISSION_DENIED",
  //                details: [{ "@type": "...ErrorInfo", reason: "API_KEY_IP_ADDRESS_BLOCKED", … }] } }
  //     → `code` is the HTTP STATUS NUMBER, NOT a string. `status` is the
  //       canonical enum. `details[].reason` is the most actionable label.
  //
  //   OpenAI / Anthropic
  //     { error: { message, type: "invalid_request_error", code: "unknown_parameter" } }
  //     → both `code` and `type` are strings.
  //
  // We pick the first STRING field we find in priority order. Calling
  // `.toLowerCase()` on a number used to throw `providerCode.toLowerCase is
  // not a function` — defended below as well.
  let providerCode: string | undefined
  let providerMessage: string | undefined
  try {
    const parsed = JSON.parse(text) as {
      error?: {
        code?: string | number
        type?: string
        status?: string
        message?: string
        param?: string
        details?: Array<{ reason?: string; '@type'?: string }>
      }
    }
    const candidates = [
      // Google: most specific signal — `details[i].reason` like
      //   API_KEY_IP_ADDRESS_BLOCKED, RATE_LIMIT_EXCEEDED, BILLING_NOT_ACTIVE.
      ...(parsed.error?.details ?? []).map((d) => d?.reason),
      parsed.error?.status,
      // OpenAI string codes.
      typeof parsed.error?.code === 'string' ? parsed.error.code : undefined,
      parsed.error?.type,
    ]
    providerCode = candidates.find((c): c is string => typeof c === 'string' && c.length > 0)
    providerMessage = parsed.error?.message
  } catch {
    // not JSON — keep providerCode undefined
  }

  const status = res.status
  const code = classifyHttp(status, providerCode)
  const retryAfterHeader = res.headers.get('retry-after')
  const retryAfterSeconds = retryAfterHeader ? parseRetryAfter(retryAfterHeader) : undefined

  const fallbackMessage =
    code === 'auth_failed'
      ? opts.authFailedMessage ?? `${opts.provider} authentication failed — check your API key.`
      : code === 'permission_denied'
        ? `${opts.provider} access denied for this model — your key may not be authorized for ${opts.model ?? 'this model'}.`
        : code === 'not_found'
          ? opts.notFoundMessage ?? `${opts.provider} could not find ${opts.model ?? 'the requested resource'}.`
          : code === 'rate_limited'
            ? `${opts.provider} is rate-limiting requests. Wait a moment and retry.`
            : code === 'quota_exceeded'
              ? `${opts.provider} billing limit reached. Top up your account and retry.`
              : code === 'content_policy'
                ? `${opts.provider} safety filter blocked this prompt.`
                : code === 'server_error'
                  ? `${opts.provider} server error (${status}). Try again shortly.`
                  : `${opts.provider} request failed (${status}).`

  return new ProviderError({
    code,
    message: providerMessage?.trim() || fallbackMessage,
    provider: opts.provider,
    model: opts.model,
    status,
    providerCode,
    rawBody,
    retryAfterSeconds,
  })
}

/** Parse Retry-After: either a delta-seconds integer or an HTTP-date. */
function parseRetryAfter(value: string): number | undefined {
  const trimmed = value.trim()
  const asInt = Number(trimmed)
  if (Number.isFinite(asInt) && asInt >= 0) return asInt
  const asDate = Date.parse(trimmed)
  if (Number.isFinite(asDate)) {
    const delta = Math.max(0, Math.round((asDate - Date.now()) / 1000))
    return delta
  }
  return undefined
}

// ─── withTimeout ─────────────────────────────────────────────────────────────

export interface TimeoutOptions {
  /** Milliseconds before the request is aborted with a `timeout` ProviderError. */
  ms: number
  /** Caller-supplied signal (e.g. user-clicks-stop). Both signals abort the request. */
  signal?: AbortSignal
  provider: string
  model?: string
}

/**
 * Wrap a fetch call with a hard timeout. Returns the response on success; throws
 * a `ProviderError({code:'timeout'})` if the deadline elapses first. Honors the
 * caller's `signal` so user-initiated cancellation is still observable.
 */
export async function withTimeout(
  perform: (signal: AbortSignal) => Promise<Response>,
  opts: TimeoutOptions,
): Promise<Response> {
  const internal = new AbortController()
  const timer = setTimeout(() => internal.abort(new Error('timeout')), opts.ms)

  // Forward external aborts to the internal controller so the underlying
  // fetch wakes up immediately when the user cancels.
  let externalListener: (() => void) | null = null
  if (opts.signal) {
    if (opts.signal.aborted) internal.abort(opts.signal.reason)
    externalListener = () => internal.abort(opts.signal!.reason)
    opts.signal.addEventListener('abort', externalListener, { once: true })
  }

  try {
    return await perform(internal.signal)
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      // External cancel wins; surface AbortError unchanged so callers can detect it.
      if (opts.signal?.aborted) throw err
      throw new ProviderError({
        code: 'timeout',
        message: `${opts.provider} request exceeded ${opts.ms}ms.`,
        provider: opts.provider,
        model: opts.model,
      })
    }
    throw err
  } finally {
    clearTimeout(timer)
    if (opts.signal && externalListener) {
      opts.signal.removeEventListener('abort', externalListener)
    }
  }
}

// ─── withRetry ───────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum attempts INCLUDING the initial call. Default 3. */
  maxAttempts?: number
  /** Base backoff in ms; doubled each attempt and jittered ±25%. */
  baseDelayMs?: number
  /** Hard cap on a single backoff (provider Retry-After can still extend). */
  maxDelayMs?: number
  /** Optional abort signal — observed between attempts. */
  signal?: AbortSignal
}

/**
 * Run an idempotent operation with exponential backoff. Only retries when the
 * operation throws a `ProviderError` whose `retriable` flag is true. Anything
 * else (validation failure, auth, content policy) is re-thrown immediately.
 *
 * For non-idempotent calls (e.g. async-generation submissions) keep maxAttempts
 * at 1 — that's the default for video/audio adapters to avoid double-billing.
 */
export async function withRetry<T>(operation: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3)
  const baseDelay = opts.baseDelayMs ?? 500
  const maxDelay = opts.maxDelayMs ?? 8000

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new DOMException('aborted', 'AbortError')
    try {
      return await operation()
    } catch (err) {
      lastError = err
      const isProvider = err instanceof ProviderError
      if (!isProvider || !err.retriable || attempt === maxAttempts) {
        throw err
      }
      const retryAfterMs = err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : undefined
      const backoff = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1))
      const jittered = backoff + (Math.random() - 0.5) * backoff * 0.5
      const delay = Math.max(retryAfterMs ?? 0, Math.round(jittered))
      await sleep(delay, opts.signal)
    }
  }
  throw lastError as Error
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal!.reason ?? new DOMException('aborted', 'AbortError'))
    }
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer)
        reject(signal.reason ?? new DOMException('aborted', 'AbortError'))
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

function classifyHttp(status: number, providerCode?: unknown): ProviderErrorCode {
  // Provider-code overrides — checked first because they're more specific than
  // HTTP status. Coerced via `typeof` so we can't NPE on a numeric or null code
  // (Google's `error.code` is a number, e.g.).
  if (typeof providerCode === 'string' && providerCode.length > 0) {
    const c = providerCode.toLowerCase()
    // Content-policy / safety filter. Be specific — broad terms like 'blocked'
    // also appear in unrelated codes (e.g. API_KEY_IP_ADDRESS_BLOCKED is a
    // permission issue, not a safety filter).
    if (
      c.includes('content_policy') ||
      c.includes('safety') ||
      c.includes('moderation') ||
      c.includes('content_blocked') ||
      c.includes('content_filter')
    ) {
      return 'content_policy'
    }
    if (
      c.includes('unknown_parameter') ||
      c.includes('invalid_request') ||
      c.includes('unknown_argument') ||
      c.includes('invalid_argument')
    ) {
      return 'invalid_request'
    }
    if (
      c.includes('insufficient_quota') ||
      c.includes('billing') ||
      c.includes('payment') ||
      c.includes('quota_exceeded')
    ) {
      return 'quota_exceeded'
    }
    if (c.includes('rate_limit') || c.includes('resource_exhausted')) {
      return 'rate_limited'
    }
    if (
      c.includes('model_not_found') ||
      c.includes('no_such_model') ||
      c.includes('not_found')
    ) {
      return 'not_found'
    }
    if (
      c.includes('permission_denied') ||
      c.includes('api_key_ip_address_blocked') ||
      c.includes('api_key_invalid') ||
      c.includes('api_key_expired') ||
      c.includes('referer_blocked')
    ) {
      // Google's IP/referer/key restrictions are 403 PERMISSION_DENIED — keep
      // the canonical code so the UI shows the same friendly headline as any
      // other 403, while the provider's verbose `message` reaches the user
      // via `mapHttpError`'s message preference.
      return 'permission_denied'
    }
    if (c.includes('unauthenticated') || c.includes('unauthorized')) {
      return 'auth_failed'
    }
  }

  if (status === 401) return 'auth_failed'
  if (status === 403) return 'permission_denied'
  if (status === 404) return 'not_found'
  if (status === 408) return 'timeout'
  if (status === 429) return 'rate_limited'
  if (status === 402) return 'quota_exceeded'
  if (status === 400) return 'invalid_request'
  if (status >= 500 && status <= 599) return 'server_error'
  return 'unknown'
}
