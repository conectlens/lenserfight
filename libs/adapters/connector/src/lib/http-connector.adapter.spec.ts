import { describe, expect, it, vi } from 'vitest'

import { HttpConnectorAdapter } from './http-connector.adapter'

import type { ConnectorMetadata } from './connector.types'

const baseMetadata: ConnectorMetadata = {
  slug: 'demo',
  name: 'Demo',
  kind: 'api',
  scopes: ['lenses:read'],
  isActive: true,
}

function fetchOk(status = 200): typeof fetch {
  return vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch
}

describe('HttpConnectorAdapter', () => {
  it('reports its slug as id', () => {
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl: fetchOk(),
    })
    expect(a.id()).toBe('demo')
  })

  it('verify rejects empty token', async () => {
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl: fetchOk(),
    })
    expect(await a.verify('')).toEqual({ ok: false, scopes: [], reason: 'token_missing' })
  })

  it('verify accepts the configured token and surfaces granted scopes', async () => {
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl: fetchOk(),
    })
    expect(await a.verify('tok_secret')).toEqual({ ok: true, scopes: ['lenses:read'] })
  })

  it('verify treats mismatched tokens as revoked', async () => {
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl: fetchOk(),
    })
    expect((await a.verify('tok_other')).reason).toBe('token_revoked')
  })

  it('dispatch posts JSON with bearer auth and event-type header', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl,
    })
    const res = await a.dispatch({ type: 'lens.published', payload: { id: 'lens_1' } })
    expect(res.ok).toBe(true)
    expect(res.status).toBe(204)
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(url).toBe('https://example.test/hook')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer tok_secret')
    expect(headers['x-lenserfight-event']).toBe('lens.published')
    expect(JSON.parse(init.body as string)).toEqual({ id: 'lens_1' })
  })

  it('dispatch returns ok:false on non-2xx without throwing', async () => {
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl: fetchOk(503),
    })
    const res = await a.dispatch({ type: 'lens.published', payload: {} })
    expect(res.ok).toBe(false)
    expect(res.status).toBe(503)
    expect(res.error).toBe('http_503')
  })

  it('dispatch surfaces network errors as ok:false', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('econnreset')
    }) as unknown as typeof fetch
    const a = new HttpConnectorAdapter({
      metadata: baseMetadata,
      endpoint: 'https://example.test/hook',
      serviceToken: 'tok_secret',
      fetchImpl,
    })
    const res = await a.dispatch({ type: 'lens.published', payload: {} })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('econnreset')
  })
})
