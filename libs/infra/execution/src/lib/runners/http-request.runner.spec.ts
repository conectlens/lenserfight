import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpRequestRunner } from './http-request.runner'

import type { HttpAuthConfig } from './http-request.runner'
import type { NodeRunnerContext } from './node-runner.interface'

const ALLOW = { allowlistedHosts: ['api.example.com'] }

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
}

function textResponse(body: string, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { 'content-type': 'text/plain', ...(init.headers ?? {}) },
  })
}

function makeCtx(nodeConfig: Record<string, unknown>, overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'http1',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig,
    ...overrides,
  }
}

describe('HttpRequestRunner', () => {
  const runner = new HttpRequestRunner()

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('declares node type as http_request', () => {
    expect(runner.nodeType).toBe('http_request')
  })

  describe('methods', () => {
    const cases: Array<{ method: string; sendsBody: boolean }> = [
      { method: 'GET', sendsBody: false },
      { method: 'POST', sendsBody: true },
      { method: 'PUT', sendsBody: true },
      { method: 'PATCH', sendsBody: true },
      { method: 'DELETE', sendsBody: false },
    ]

    it.each(cases)('issues a $method request and returns status/headers/data', async ({ method, sendsBody }) => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ ok: true }, { headers: { 'x-rate': '99' } }),
      )
      vi.stubGlobal('fetch', fetchMock)

      const result = await runner.execute(
        makeCtx({ url: 'https://api.example.com/v1', method, body: { a: 1 }, ...ALLOW }),
      )

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe('https://api.example.com/v1')
      expect(init.method).toBe(method)
      if (sendsBody) {
        expect(init.body).toBe(JSON.stringify({ a: 1 }))
        expect(init.headers['Content-Type']).toBe('application/json')
      } else {
        expect(init.body).toBeUndefined()
      }
      expect(result.output.data?.['status']).toBe(200)
      expect(result.output.data?.['headers']).toMatchObject({ 'x-rate': '99' })
      expect(result.output.data?.['data']).toEqual({ ok: true })
      expect(result.output.data?.['ok']).toBe(true)
    })
  })

  it('rejects an unknown method without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await runner.execute(makeCtx({ url: 'https://api.example.com', method: 'TRACE', ...ALLOW }))
    expect(result.output.data?.['error']).toBe('method_not_allowed')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('errors when url is missing', async () => {
    const result = await runner.execute(makeCtx({ method: 'GET', ...ALLOW }))
    expect(result.output.data?.['error']).toBe('url_required')
  })

  describe('body serialization', () => {
    it('serializes form body as urlencoded', async () => {
      const fetchMock = vi.fn().mockResolvedValue(textResponse('ok'))
      vi.stubGlobal('fetch', fetchMock)
      await runner.execute(
        makeCtx({ url: 'https://api.example.com', method: 'POST', bodyType: 'form', body: { a: '1', b: 2 }, ...ALLOW }),
      )
      const init = fetchMock.mock.calls[0][1]
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
      expect(init.body).toBe('a=1&b=2')
    })

    it('sends text body verbatim', async () => {
      const fetchMock = vi.fn().mockResolvedValue(textResponse('ok'))
      vi.stubGlobal('fetch', fetchMock)
      await runner.execute(
        makeCtx({ url: 'https://api.example.com', method: 'POST', bodyType: 'text', body: 'raw payload', ...ALLOW }),
      )
      const init = fetchMock.mock.calls[0][1]
      expect(init.headers['Content-Type']).toBe('text/plain')
      expect(init.body).toBe('raw payload')
    })
  })

  describe('response parsing', () => {
    it('parses JSON responses into structured data', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [1, 2] })))
      const result = await runner.execute(makeCtx({ url: 'https://api.example.com', ...ALLOW }))
      expect(result.output.data?.['data']).toEqual({ items: [1, 2] })
    })

    it('returns text as-is for non-JSON responses', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('plain body')))
      const result = await runner.execute(makeCtx({ url: 'https://api.example.com', ...ALLOW }))
      expect(result.output.data?.['data']).toBe('plain body')
      expect(result.output.text).toBe('plain body')
    })

    it('falls back to text when JSON content-type body is malformed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response('{bad json', { status: 200, headers: { 'content-type': 'application/json' } }),
      ))
      const result = await runner.execute(makeCtx({ url: 'https://api.example.com', ...ALLOW }))
      expect(result.output.data?.['data']).toBe('{bad json')
    })
  })

  describe('query params', () => {
    it('appends query params to the URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
      vi.stubGlobal('fetch', fetchMock)
      await runner.execute(
        makeCtx({ url: 'https://api.example.com/search', queryParams: { q: 'cats', page: 2 }, ...ALLOW }),
      )
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/search?q=cats&page=2')
    })
  })

  describe('auth injection', () => {
    const authCases: Array<{
      name: string
      auth: HttpAuthConfig
      assert: (headers: Record<string, string>, url: string) => void
    }> = [
      {
        name: 'bearer',
        auth: { type: 'bearer', connectorRef: 'c1' },
        assert: (h) => expect(h['Authorization']).toBe('Bearer tok-123'),
      },
      {
        name: 'basic',
        auth: { type: 'basic', connectorRef: 'c1' },
        assert: (h) => expect(h['Authorization']).toBe(`Basic ${Buffer.from('tok-123').toString('base64')}`),
      },
      {
        name: 'custom header',
        auth: { type: 'header', connectorRef: 'c1', headerName: 'X-Auth' },
        assert: (h) => expect(h['X-Auth']).toBe('tok-123'),
      },
      {
        name: 'api_key in query',
        auth: { type: 'api_key', connectorRef: 'c1', in: 'query', paramName: 'key' },
        assert: (_h, url) => expect(url).toContain('key=tok-123'),
      },
    ]

    it.each(authCases)('injects $name credential resolved from connector', async ({ auth, assert }) => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
      vi.stubGlobal('fetch', fetchMock)
      const resolveConnector = vi.fn().mockResolvedValue('tok-123')

      const result = await runner.execute(
        makeCtx({ url: 'https://api.example.com', auth, ...ALLOW }, { resolveConnector }),
      )

      expect(resolveConnector).toHaveBeenCalledWith('c1', undefined)
      const [url, init] = fetchMock.mock.calls[0]
      assert(init.headers, url as string)
      // Secret must never appear in the runner output.
      expect(JSON.stringify(result.output.data)).not.toContain('tok-123')
      expect(result.output.data?.['authScheme']).toBe(auth.type)
    })

    it('fails closed when the credential cannot be resolved (no token)', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const resolveConnector = vi.fn().mockResolvedValue(null)
      const result = await runner.execute(
        makeCtx({ url: 'https://api.example.com', auth: { type: 'bearer', connectorRef: 'c1' }, ...ALLOW },
          { resolveConnector }),
      )
      expect(result.output.data?.['error']).toBe('credential_unavailable')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('fails closed when no resolver is present (browser/dry-run)', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const result = await runner.execute(
        makeCtx({ url: 'https://api.example.com', auth: { type: 'bearer', connectorRef: 'c1' }, ...ALLOW }),
      )
      expect(result.output.data?.['error']).toBe('credential_unavailable')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('requires a connectorRef for auth', async () => {
      const result = await runner.execute(
        makeCtx({ url: 'https://api.example.com', auth: { type: 'bearer' }, ...ALLOW }),
      )
      expect(result.output.data?.['error']).toBe('auth_connector_ref_required')
    })
  })

  describe('SSRF safety', () => {
    it('rejects a private/metadata host before fetching', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const result = await runner.execute(
        makeCtx({ url: 'https://169.254.169.254/latest', allowlistedHosts: ['169.254.169.254'] }),
      )
      expect(result.output.data?.['error']).toBe('private_or_metadata_host_blocked')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects a host that is not allowlisted', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const result = await runner.execute(makeCtx({ url: 'https://evil.test/steal', ...ALLOW }))
      expect(result.output.data?.['error']).toBe('host_not_allowlisted')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects http when httpsOnly (default)', async () => {
      const result = await runner.execute(makeCtx({ url: 'http://api.example.com', ...ALLOW }))
      expect(result.output.data?.['error']).toBe('https_required')
    })

    it('rejects when no allowlist is configured', async () => {
      const result = await runner.execute(makeCtx({ url: 'https://api.example.com' }))
      expect(result.output.data?.['error']).toBe('allowlist_required')
    })
  })

  describe('timeout / abort', () => {
    it('reports request_aborted when fetch is aborted', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' }),
      ))
      const result = await runner.execute(makeCtx({ url: 'https://api.example.com', timeoutMs: 5, ...ALLOW }))
      expect(result.output.data?.['error']).toBe('request_aborted')
    })

    it('reports request_failed on a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
      const result = await runner.execute(makeCtx({ url: 'https://api.example.com', ...ALLOW }))
      expect(result.output.data?.['error']).toBe('request_failed')
    })

    it('passes a combined abort signal when the engine provides one', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
      vi.stubGlobal('fetch', fetchMock)
      const controller = new AbortController()
      await runner.execute(makeCtx({ url: 'https://api.example.com', ...ALLOW }, { signal: controller.signal }))
      const init = fetchMock.mock.calls[0][1]
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })
  })
})
