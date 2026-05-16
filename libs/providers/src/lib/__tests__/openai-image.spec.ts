import { openaiImageAdapter } from '../openai-image'
import { ProviderError } from '../provider-errors'

/**
 * Captures the JSON body of the first matching fetch call so tests can assert
 * which parameters reached the wire. Returns the body via `getBody()`.
 */
function captureFetch(opts: {
  status?: number
  responseBody: object | string
  contentType?: string
}) {
  const { status = 200, responseBody, contentType = 'application/json' } = opts
  let captured: Record<string, unknown> | null = null
  const spy = jest.spyOn(global, 'fetch').mockImplementation(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === 'string') {
        try { captured = JSON.parse(init.body) as Record<string, unknown> } catch { /* */ }
      }
      const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
      return new Response(bodyStr, { status, headers: { 'Content-Type': contentType } })
    },
  )
  return {
    getBody(): Record<string, unknown> | null { return captured },
    restore() { spy.mockRestore() },
    spy,
  }
}

describe('openaiImageAdapter — param filtering', () => {
  let mock: ReturnType<typeof captureFetch>

  afterEach(() => { mock?.restore() })

  it('sends style ONLY for dall-e-3 (not gpt-image-1)', async () => {
    mock = captureFetch({ responseBody: { data: [{ url: 'https://x/y.png' }] } })
    await openaiImageAdapter.generate('sk-test', 'dall-e-3', 'a cat', { style: 'vivid' })
    expect(mock.getBody()).toMatchObject({ model: 'dall-e-3', style: 'vivid' })
  })

  it('strips style + response_format for gpt-image-1 (alias dall-e-4)', async () => {
    // Regression for: 400 "Unknown parameter: 'style'" on dall-e-4 / gpt-image-1.
    mock = captureFetch({ responseBody: { data: [{ b64_json: 'aGVsbG8=' }] } })
    await openaiImageAdapter.generate('sk-test', 'dall-e-4', 'a cat', { style: 'vivid' })
    const body = mock.getBody()
    expect(body).not.toHaveProperty('style')
    expect(body).not.toHaveProperty('response_format')
    // dall-e-4 → gpt-image-1 alias resolution
    expect(body).toMatchObject({ model: 'gpt-image-1' })
  })

  it('routes gpt-image-1 by its real name as well', async () => {
    mock = captureFetch({ responseBody: { data: [{ b64_json: 'aGVsbG8=' }] } })
    await openaiImageAdapter.generate('sk-test', 'gpt-image-1', 'a cat', { quality: 'high' })
    expect(mock.getBody()).toMatchObject({ model: 'gpt-image-1', quality: 'high' })
  })

  it('strips style + quality for dall-e-2 (legacy)', async () => {
    mock = captureFetch({ responseBody: { data: [{ url: 'https://x/y.png' }] } })
    await openaiImageAdapter.generate('sk-test', 'dall-e-2', 'a cat', {
      style: 'vivid',
      quality: 'hd',
    })
    const body = mock.getBody()
    expect(body).not.toHaveProperty('style')
    expect(body).not.toHaveProperty('quality')
  })

  it('clamps unsupported size to a valid one per model', async () => {
    mock = captureFetch({ responseBody: { data: [{ url: 'https://x/y.png' }] } })
    // 1792x1024 is dall-e-3-only — invalid for dall-e-2, should fall back.
    await openaiImageAdapter.generate('sk-test', 'dall-e-2', 'a cat', { width: 1792, height: 1024 })
    expect(mock.getBody()?.size).toBe('256x256')
  })

  it('clamps n to 1 for dall-e-3 (which forbids batches)', async () => {
    mock = captureFetch({ responseBody: { data: [{ url: 'https://x/y.png' }] } })
    await openaiImageAdapter.generate('sk-test', 'dall-e-3', 'a cat', { n: 5 })
    expect(mock.getBody()?.n).toBe(1)
  })

  it('rejects unknown model with unsupported_model ProviderError', async () => {
    mock = captureFetch({ responseBody: { data: [{ url: 'https://x' }] } })
    await expect(
      openaiImageAdapter.generate('sk-test', 'unicorn-9000', 'prompt', {}),
    ).rejects.toMatchObject({ code: 'unsupported_model' })
  })

  it('rejects empty prompt with invalid_request ProviderError', async () => {
    mock = captureFetch({ responseBody: { data: [{ url: 'https://x' }] } })
    await expect(
      openaiImageAdapter.generate('sk-test', 'dall-e-3', '   ', {}),
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })

  it('maps OpenAI 400 unknown_parameter into invalid_request', async () => {
    mock = captureFetch({
      status: 400,
      responseBody: {
        error: {
          message: "Unknown parameter: 'style'.",
          type: 'invalid_request_error',
          param: 'style',
          code: 'unknown_parameter',
        },
      },
    })
    try {
      await openaiImageAdapter.generate('sk-test', 'dall-e-3', 'prompt', {})
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).code).toBe('invalid_request')
      expect((err as ProviderError).retriable).toBe(false)
    }
  })

  it('maps 401 to auth_failed (non-retriable)', async () => {
    mock = captureFetch({
      status: 401,
      responseBody: { error: { message: 'bad key' } },
    })
    await expect(
      openaiImageAdapter.generate('sk-bad', 'dall-e-3', 'prompt', {}),
    ).rejects.toMatchObject({ code: 'auth_failed', retriable: false })
  })

  it('maps 429 to rate_limited (retriable)', async () => {
    mock = captureFetch({
      status: 429,
      responseBody: { error: { message: 'too many' } },
    })
    await expect(
      openaiImageAdapter.generate('sk-test', 'dall-e-3', 'prompt', {}),
    ).rejects.toMatchObject({ code: 'rate_limited', retriable: true })
  })

  it('maps content_policy_violation regardless of HTTP status', async () => {
    mock = captureFetch({
      status: 400,
      responseBody: {
        error: {
          message: 'Your request was blocked by safety system.',
          code: 'content_policy_violation',
        },
      },
    })
    await expect(
      openaiImageAdapter.generate('sk-test', 'dall-e-3', 'flagged', {}),
    ).rejects.toMatchObject({ code: 'content_policy' })
  })

  it('returns b64_json data URL when provider omits hosted URL', async () => {
    mock = captureFetch({ responseBody: { data: [{ b64_json: 'aGVsbG8=' }] } })
    const result = await openaiImageAdapter.generate('sk-test', 'gpt-image-1', 'a cat', {})
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toMatch(/^data:image\/png;base64,/)
    }
  })
})
