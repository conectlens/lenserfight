// Provider resilience tests — validates ProviderError classification,
// retriability, Retry-After handling, and error mapping correctness.
import { ProviderError, mapHttpError } from '../provider-errors'
import type { ProviderErrorCode } from '../provider-errors'

// ── ProviderError unit tests ─────────────────────────────────────────────────

describe('ProviderError', () => {
  describe('retriability', () => {
    const retriableCodes: ProviderErrorCode[] = ['rate_limited', 'timeout', 'server_error']
    const nonRetriableCodes: ProviderErrorCode[] = [
      'auth_failed', 'permission_denied', 'not_found',
      'invalid_request', 'unsupported_model', 'content_policy',
      'quota_exceeded', 'unknown',
    ]

    for (const code of retriableCodes) {
      it(`marks ${code} as retriable`, () => {
        const err = new ProviderError({ code, message: 'test', provider: 'openai' })
        expect(err.retriable).toBe(true)
      })
    }

    for (const code of nonRetriableCodes) {
      it(`marks ${code} as non-retriable`, () => {
        const err = new ProviderError({ code, message: 'test', provider: 'openai' })
        expect(err.retriable).toBe(false)
      })
    }
  })

  describe('traceId', () => {
    it('generates traceId when not provided', () => {
      const err = new ProviderError({ code: 'unknown', message: 'x', provider: 'test' })
      expect(err.traceId).toMatch(/^lf-[a-z0-9]+$/)
    })

    it('uses provided traceId', () => {
      const err = new ProviderError({ code: 'unknown', message: 'x', provider: 'test', traceId: 'custom-id' })
      expect(err.traceId).toBe('custom-id')
    })
  })

  describe('retryAfterSeconds', () => {
    it('stores Retry-After hint when provided', () => {
      const err = new ProviderError({
        code: 'rate_limited',
        message: 'slow down',
        provider: 'openai',
        retryAfterSeconds: 30,
      })
      expect(err.retryAfterSeconds).toBe(30)
    })

    it('is undefined when not provided', () => {
      const err = new ProviderError({ code: 'rate_limited', message: 'x', provider: 'test' })
      expect(err.retryAfterSeconds).toBeUndefined()
    })
  })

  describe('toUserString', () => {
    it('includes trace id in user-facing message', () => {
      const err = new ProviderError({
        code: 'auth_failed',
        message: 'Invalid API key',
        provider: 'openai',
        traceId: 'lf-abc123',
      })
      expect(err.toUserString()).toBe('Invalid API key (ref: lf-abc123)')
    })
  })

  describe('error properties', () => {
    it('preserves provider, model, and status fields', () => {
      const err = new ProviderError({
        code: 'server_error',
        message: 'Internal error',
        provider: 'anthropic',
        model: 'claude-3',
        status: 500,
        providerCode: 'internal_error',
      })
      expect(err.provider).toBe('anthropic')
      expect(err.model).toBe('claude-3')
      expect(err.status).toBe(500)
      expect(err.providerCode).toBe('internal_error')
    })
  })
})

// ── mapHttpError tests ───────────────────────────────────────────────────────

describe('mapHttpError', () => {
  function mockResponse(status: number, body: string, headers?: Record<string, string>): Response {
    return {
      status,
      text: async () => body,
      headers: new Headers(headers ?? {}),
    } as unknown as Response
  }

  it('maps 401 to auth_failed', async () => {
    const res = mockResponse(401, '{"error": {"message": "Incorrect API key"}}')
    const err = await mapHttpError(res, { provider: 'openai', model: 'gpt-4o' })

    expect(err).toBeInstanceOf(ProviderError)
    expect(err.code).toBe('auth_failed')
    expect(err.retriable).toBe(false)
  })

  it('maps 403 to permission_denied', async () => {
    const res = mockResponse(403, '{"error": {"message": "Access denied"}}')
    const err = await mapHttpError(res, { provider: 'anthropic' })

    expect(err.code).toBe('permission_denied')
    expect(err.retriable).toBe(false)
  })

  it('maps 429 to rate_limited', async () => {
    const res = mockResponse(429, '{"error": {"message": "Rate limit exceeded"}}')
    const err = await mapHttpError(res, { provider: 'openai' })

    expect(err.code).toBe('rate_limited')
    expect(err.retriable).toBe(true)
  })

  it('maps 500 to server_error', async () => {
    const res = mockResponse(500, 'Internal Server Error')
    const err = await mapHttpError(res, { provider: 'gemini' })

    expect(err.code).toBe('server_error')
    expect(err.retriable).toBe(true)
  })

  it('maps 502/503 to server_error', async () => {
    const res = mockResponse(502, 'Bad Gateway')
    const err = await mapHttpError(res, { provider: 'mistral' })

    expect(err.code).toBe('server_error')
    expect(err.retriable).toBe(true)
  })

  it('maps 404 to not_found', async () => {
    const res = mockResponse(404, '{"error": {"message": "model not found"}}')
    const err = await mapHttpError(res, { provider: 'openai', model: 'gpt-99' })

    expect(err.code).toBe('not_found')
    expect(err.model).toBe('gpt-99')
  })

  it('sanitizes API keys from raw body', async () => {
    const res = mockResponse(400, 'Invalid key: sk-proj-abcdefghijklmnop12345678')
    const err = await mapHttpError(res, { provider: 'openai' })

    expect(err.rawBody).not.toContain('sk-proj-abcdefghijklmnop')
    expect(err.rawBody).toContain('sk-***')
  })

  it('truncates long response bodies to 200 chars', async () => {
    const longBody = 'x'.repeat(500)
    const res = mockResponse(400, longBody)
    const err = await mapHttpError(res, { provider: 'test' })

    expect(err.rawBody!.length).toBeLessThanOrEqual(200)
  })

  it('handles empty/unparseable response body', async () => {
    const res = mockResponse(500, '')
    const err = await mapHttpError(res, { provider: 'ollama' })

    expect(err.code).toBe('server_error')
    expect(err.rawBody).toBe('')
  })
})
