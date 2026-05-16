/**
 * Shared `fetch` recorder for provider adapter and gating tests.
 *
 * Replaces the inline `captureFetch(...)` helpers that every adapter spec
 * re-defines (see `__tests__/openai-image.spec.ts:8`, `kling.spec.ts`,
 * `google-imagen.spec.ts`, etc.).
 *
 * Why centralize: the negative-path suite needs to prove that pre-flight
 * gates throw BEFORE any HTTP call. `assertNoCalls()` is the contract that
 * spec couldn't enforce uniformly when every file rolled its own recorder.
 *
 * GRASP — *Pure Fabrication*. One module owns the `fetch` mock lifecycle
 * so test files can focus on what they're asserting.
 */

export interface RecordedRequest {
  url: string
  method: string
  headers: Record<string, string>
  /** Raw body string. Most adapters send JSON. */
  bodyText: string | null
  /** Parsed JSON body when the body parsed cleanly; null otherwise. */
  bodyJson: Record<string, unknown> | null
}

export interface MockResponseOptions {
  status?: number
  body?: object | string
  contentType?: string
  headers?: Record<string, string>
}

/**
 * Installs a `fetch` mock that records every request and returns the queued
 * response. Call `install()` before the operation under test and `uninstall()`
 * in `afterEach`. The default queued response is `200 {}` so adapters parsing
 * JSON still get a valid body.
 *
 * Usage:
 *
 *   const rec = new ProviderRequestRecorder()
 *   rec.queueResponse({ body: { data: [{ url: 'https://x/y.png' }] } })
 *   rec.install()
 *   await adapter.generate(...)
 *   expect(rec.requests).toHaveLength(1)
 *   expect(rec.requests[0].bodyJson).toMatchObject({ model: 'dall-e-3' })
 *   rec.uninstall()
 */
export class ProviderRequestRecorder {
  private originalFetch: typeof fetch | undefined
  private spy: jest.SpyInstance | undefined
  private readonly recorded: RecordedRequest[] = []
  private readonly responseQueue: MockResponseOptions[] = []
  /** Response used after the queue empties (default: 200 {}). */
  private defaultResponse: MockResponseOptions = { status: 200, body: {} }

  /** All requests captured since the last `reset()` / `install()`. */
  get requests(): ReadonlyArray<RecordedRequest> {
    return this.recorded
  }

  /** Most recently captured request (convenience accessor for single-call specs). */
  get lastRequest(): RecordedRequest | undefined {
    return this.recorded[this.recorded.length - 1]
  }

  /** Push a response to the FIFO queue. Use one queueResponse per expected call. */
  queueResponse(opts: MockResponseOptions): this {
    this.responseQueue.push(opts)
    return this
  }

  /** Replace the fallback response used after the queue is drained. */
  setDefaultResponse(opts: MockResponseOptions): this {
    this.defaultResponse = opts
    return this
  }

  /** Mount the mock and start recording. Idempotent — safe to call twice. */
  install(): this {
    if (this.spy) return this
    this.originalFetch = globalThis.fetch
    this.spy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      (async (input: RequestInfo | URL, init?: RequestInit) => {
        this.recorded.push(toRecordedRequest(input, init))
        const next = this.responseQueue.shift() ?? this.defaultResponse
        return buildResponse(next)
      }) as typeof fetch,
    )
    return this
  }

  /** Restore the real `fetch`. Always call in `afterEach`. */
  uninstall(): void {
    this.spy?.mockRestore()
    this.spy = undefined
    this.originalFetch = undefined
  }

  /** Clear recorded requests and the response queue. */
  reset(): void {
    this.recorded.length = 0
    this.responseQueue.length = 0
  }

  /**
   * Assert that the recorder captured zero requests. Use this from
   * negative-path suites to prove pre-flight gates throw BEFORE any HTTP I/O.
   * Throws on failure so jest reports the diff.
   */
  assertNoCalls(reason = 'pre-flight gate should have thrown before any HTTP call'): void {
    if (this.recorded.length === 0) return
    const urls = this.recorded.map((r) => `${r.method} ${r.url}`).join(', ')
    throw new Error(`${reason} — observed ${this.recorded.length} call(s): ${urls}`)
  }
}

function toRecordedRequest(input: RequestInfo | URL, init?: RequestInit): RecordedRequest {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const headers = normalizeHeaders(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const bodyText = readBody(init?.body)
  let bodyJson: Record<string, unknown> | null = null
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText)
      if (parsed && typeof parsed === 'object') bodyJson = parsed as Record<string, unknown>
    } catch { /* not JSON — leave null */ }
  }
  return { url, method, headers, bodyText, bodyJson }
}

function normalizeHeaders(h?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {}
  if (!h) return out
  if (h instanceof Headers) {
    h.forEach((v, k) => { out[k.toLowerCase()] = v })
    return out
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k.toLowerCase()] = v
    return out
  }
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = String(v)
  return out
}

function readBody(body: BodyInit | null | undefined): string | null {
  if (body == null) return null
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  // FormData / Blob / ArrayBuffer — recorder returns null and tests should
  // assert against `bodyText === null` (they typically only care about JSON).
  return null
}

function buildResponse(opts: MockResponseOptions): Response {
  const status = opts.status ?? 200
  const contentType = opts.contentType ?? 'application/json'
  const headers = new Headers({ 'content-type': contentType, ...(opts.headers ?? {}) })
  const body = opts.body == null
    ? ''
    : typeof opts.body === 'string'
      ? opts.body
      : JSON.stringify(opts.body)
  return new Response(body, { status, headers })
}
