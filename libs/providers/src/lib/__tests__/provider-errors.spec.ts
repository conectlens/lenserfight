import { ProviderError, mapHttpError, withRetry, withTimeout } from '../provider-errors'

describe('ProviderError', () => {
  it('marks rate_limited as retriable', () => {
    const err = new ProviderError({ code: 'rate_limited', message: 'slow down', provider: 'X' })
    expect(err.retriable).toBe(true)
  })

  it('marks auth_failed as non-retriable', () => {
    const err = new ProviderError({ code: 'auth_failed', message: 'bad key', provider: 'X' })
    expect(err.retriable).toBe(false)
  })

  it('always emits a traceId', () => {
    const err = new ProviderError({ code: 'unknown', message: 'x', provider: 'X' })
    expect(err.traceId).toMatch(/^lf-/)
  })

  it('toUserString appends ref id', () => {
    const err = new ProviderError({ code: 'server_error', message: 'down', provider: 'X' })
    expect(err.toUserString()).toContain('ref:')
  })
})

describe('mapHttpError', () => {
  it('strips api keys from rawBody', async () => {
    const res = new Response('Bearer sk-abcdef0123456789xyz failed', { status: 401 })
    const err = await mapHttpError(res, { provider: 'Test' })
    expect(err.rawBody).not.toContain('sk-abcdef')
    expect(err.code).toBe('auth_failed')
  })

  it('classifies 429 with Retry-After', async () => {
    const res = new Response('{"error":{"message":"rate"}}', {
      status: 429,
      headers: { 'Retry-After': '3', 'content-type': 'application/json' },
    })
    const err = await mapHttpError(res, { provider: 'Test' })
    expect(err.code).toBe('rate_limited')
    expect(err.retryAfterSeconds).toBe(3)
  })

  it('classifies unknown_parameter as invalid_request', async () => {
    const res = new Response(
      '{"error":{"message":"Unknown parameter: style","code":"unknown_parameter"}}',
      { status: 400, headers: { 'content-type': 'application/json' } },
    )
    const err = await mapHttpError(res, { provider: 'Test' })
    expect(err.code).toBe('invalid_request')
    expect(err.message).toContain('Unknown parameter')
  })

  it('classifies content_policy_violation regardless of HTTP status', async () => {
    const res = new Response(
      '{"error":{"message":"blocked","code":"content_policy_violation"}}',
      { status: 400, headers: { 'content-type': 'application/json' } },
    )
    const err = await mapHttpError(res, { provider: 'Test' })
    expect(err.code).toBe('content_policy')
  })

  it('handles Google AI Studio numeric error.code without crashing on toLowerCase', async () => {
    // Regression for: `providerCode.toLowerCase is not a function` —
    // Google returns `error.code` as a NUMBER (the HTTP status); previously we
    // assigned it to a string and called .toLowerCase(). Now we extract from
    // `error.status` / `error.details[].reason` (strings) instead.
    const googleBody = {
      error: {
        code: 403,
        message:
          'The provided API key has an IP address restriction. The originating IP address of the call (2a09:bac1:72a0:f00::3d6:17) violates this restriction.',
        status: 'PERMISSION_DENIED',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'API_KEY_IP_ADDRESS_BLOCKED',
            domain: 'googleapis.com',
          },
        ],
      },
    }
    const res = new Response(JSON.stringify(googleBody), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
    const err = await mapHttpError(res, { provider: 'Google Imagen' })
    expect(err.code).toBe('permission_denied')
    // The user-facing message MUST be Google's actual text, not the generic
    // "access denied for this model" fallback.
    expect(err.message).toMatch(/IP address restriction/)
    expect(err.message).toContain('2a09:bac1:72a0:f00::3d6:17')
    expect(err.providerCode).toBe('API_KEY_IP_ADDRESS_BLOCKED')
  })

  it('classifies Google RESOURCE_EXHAUSTED as rate_limited', async () => {
    const res = new Response(
      JSON.stringify({
        error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' },
      }),
      { status: 429, headers: { 'content-type': 'application/json' } },
    )
    const err = await mapHttpError(res, { provider: 'Google' })
    expect(err.code).toBe('rate_limited')
  })

  it('falls back gracefully when error.code is non-string and no other string field exists', async () => {
    const res = new Response(
      JSON.stringify({ error: { code: 500, message: 'boom' } }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
    const err = await mapHttpError(res, { provider: 'X' })
    expect(err.code).toBe('server_error')
    expect(err.providerCode).toBeUndefined()
    expect(err.message).toBe('boom')
  })
})

describe('withTimeout', () => {
  it('returns the response when it completes in time', async () => {
    const res = await withTimeout(
      async () => new Response('ok'),
      { provider: 'X', ms: 100 },
    )
    expect(res.status).toBe(200)
  })

  it('throws a timeout ProviderError when the deadline elapses', async () => {
    const slow = async (signal: AbortSignal) => {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, 200)
        signal.addEventListener('abort', () => {
          clearTimeout(t)
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
      return new Response('late')
    }
    await expect(
      withTimeout(slow, { provider: 'X', ms: 50 }),
    ).rejects.toMatchObject({ code: 'timeout' })
  })
})

describe('withRetry', () => {
  it('returns the result on the first try if no error', async () => {
    const op = jest.fn().mockResolvedValue(42)
    expect(await withRetry(op, { maxAttempts: 3 })).toBe(42)
    expect(op).toHaveBeenCalledTimes(1)
  })

  it('retries on retriable ProviderError up to maxAttempts', async () => {
    const op = jest.fn()
      .mockRejectedValueOnce(new ProviderError({ code: 'rate_limited', message: '1', provider: 'X' }))
      .mockResolvedValueOnce('ok')
    const result = await withRetry(op, { maxAttempts: 3, baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(op).toHaveBeenCalledTimes(2)
  })

  it('does NOT retry on non-retriable ProviderError', async () => {
    const op = jest.fn().mockRejectedValue(
      new ProviderError({ code: 'auth_failed', message: 'bad', provider: 'X' }),
    )
    await expect(withRetry(op, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toMatchObject({
      code: 'auth_failed',
    })
    expect(op).toHaveBeenCalledTimes(1)
  })

  it('re-throws after exhausting retries', async () => {
    const op = jest.fn().mockRejectedValue(
      new ProviderError({ code: 'rate_limited', message: 'rate', provider: 'X' }),
    )
    await expect(withRetry(op, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toMatchObject({
      code: 'rate_limited',
    })
    expect(op).toHaveBeenCalledTimes(2)
  })
})
