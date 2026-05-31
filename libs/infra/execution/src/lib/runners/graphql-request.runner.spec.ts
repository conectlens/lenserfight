import { afterEach, describe, expect, it, vi } from 'vitest'

import { GraphqlRequestRunner } from './graphql-request.runner'

import type { NodeRunnerContext } from './node-runner.interface'

const ALLOW = { allowlistedHosts: ['gql.example.com'] }
const QUERY = 'query Me { me { id name } }'

function gqlResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function makeCtx(nodeConfig: Record<string, unknown>, overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'gql1',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig,
    ...overrides,
  }
}

describe('GraphqlRequestRunner', () => {
  const runner = new GraphqlRequestRunner()

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('declares node type as graphql_request', () => {
    expect(runner.nodeType).toBe('graphql_request')
  })

  it('POSTs query + variables and returns data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gqlResponse({ data: { me: { id: '1', name: 'Ada' } } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runner.execute(
      makeCtx({ url: 'https://gql.example.com/graphql', query: QUERY, variables: { id: '1' }, ...ALLOW }),
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gql.example.com/graphql')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ query: QUERY, variables: { id: '1' } })
    expect(result.output.data?.['data']).toEqual({ me: { id: '1', name: 'Ada' } })
    expect(result.output.data?.['errors']).toEqual([])
    expect(result.output.data?.['ok']).toBe(true)
  })

  it('includes operationName when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gqlResponse({ data: {} }))
    vi.stubGlobal('fetch', fetchMock)
    await runner.execute(
      makeCtx({ url: 'https://gql.example.com/graphql', query: QUERY, operationName: 'Me', ...ALLOW }),
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ operationName: 'Me' })
  })

  it('surfaces GraphQL errors and marks ok=false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      gqlResponse({ data: null, errors: [{ message: 'Unauthorized' }] }),
    ))
    const result = await runner.execute(makeCtx({ url: 'https://gql.example.com/graphql', query: QUERY, ...ALLOW }))
    expect(result.output.data?.['errors']).toEqual([{ message: 'Unauthorized' }])
    expect(result.output.data?.['ok']).toBe(false)
  })

  it('returns invalid_graphql_response on non-JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<html>502</html>', { status: 502, headers: { 'content-type': 'text/html' } }),
    ))
    const result = await runner.execute(makeCtx({ url: 'https://gql.example.com/graphql', query: QUERY, ...ALLOW }))
    expect(result.output.data?.['error']).toBe('invalid_graphql_response')
    expect(result.output.data?.['status']).toBe(502)
  })

  describe('validation', () => {
    it('errors when url is missing', async () => {
      const result = await runner.execute(makeCtx({ query: QUERY, ...ALLOW }))
      expect(result.output.data?.['error']).toBe('url_required')
    })

    it('errors when query is missing', async () => {
      const result = await runner.execute(makeCtx({ url: 'https://gql.example.com/graphql', ...ALLOW }))
      expect(result.output.data?.['error']).toBe('query_required')
    })

    it('errors when query exceeds the size cap', async () => {
      const result = await runner.execute(
        makeCtx({ url: 'https://gql.example.com/graphql', query: 'q'.repeat(100_001), ...ALLOW }),
      )
      expect(result.output.data?.['error']).toBe('query_too_large')
    })
  })

  describe('auth injection', () => {
    it('injects a bearer token resolved from the connector without logging it', async () => {
      const fetchMock = vi.fn().mockResolvedValue(gqlResponse({ data: {} }))
      vi.stubGlobal('fetch', fetchMock)
      const resolveConnector = vi.fn().mockResolvedValue('gql-secret')

      const result = await runner.execute(
        makeCtx(
          { url: 'https://gql.example.com/graphql', query: QUERY, auth: { type: 'bearer', connectorRef: 'c1', scopes: ['read'] }, ...ALLOW },
          { resolveConnector },
        ),
      )

      expect(resolveConnector).toHaveBeenCalledWith('c1', ['read'])
      expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer gql-secret')
      expect(JSON.stringify(result.output.data)).not.toContain('gql-secret')
    })

    it('fails closed when the credential is unavailable', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const result = await runner.execute(
        makeCtx({ url: 'https://gql.example.com/graphql', query: QUERY, auth: { type: 'bearer', connectorRef: 'c1' }, ...ALLOW },
          { resolveConnector: vi.fn().mockResolvedValue(null) }),
      )
      expect(result.output.data?.['error']).toBe('credential_unavailable')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('SSRF safety', () => {
    it('rejects a metadata host before fetching', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const result = await runner.execute(
        makeCtx({ url: 'https://169.254.169.254/graphql', query: QUERY, allowlistedHosts: ['169.254.169.254'] }),
      )
      expect(result.output.data?.['error']).toBe('private_or_metadata_host_blocked')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects a non-allowlisted host', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const result = await runner.execute(makeCtx({ url: 'https://evil.test/graphql', query: QUERY, ...ALLOW }))
      expect(result.output.data?.['error']).toBe('host_not_allowlisted')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('timeout / abort', () => {
    it('reports request_aborted when fetch is aborted', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' }),
      ))
      const result = await runner.execute(
        makeCtx({ url: 'https://gql.example.com/graphql', query: QUERY, timeoutMs: 5, ...ALLOW }),
      )
      expect(result.output.data?.['error']).toBe('request_aborted')
    })
  })
})
