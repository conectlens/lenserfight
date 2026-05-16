import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_GATEWAY_URL,
  LocalKeysGatewayClient,
  SESSION_GATEWAY_URL_KEY,
  SESSION_TOKEN_KEY,
  deriveGatewayUrl,
} from '../src/lib/browser/gateway-client'
import { LocalKeyStoreError } from '../src/lib/ports'

interface MemSession {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
  values(): string[]
}

function memSession(): MemSession {
  const store = new Map<string, string>()
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v)
    },
    removeItem: (k) => {
      store.delete(k)
    },
    values: () => [...store.values()],
  }
}

function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('LocalKeysGatewayClient', () => {
  it('throws gateway_not_paired before a token is stored', async () => {
    const client = new LocalKeysGatewayClient({
      sessionStore: memSession(),
      fetchImpl: async () => jsonRes(200, {}),
    })
    let err: unknown
    try {
      await client.list()
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(LocalKeyStoreError)
    expect((err as LocalKeyStoreError).code).toBe('gateway_not_paired')
  })

  it('sends Authorization: Bearer <token> on every request', async () => {
    const session = memSession()
    const captured: { url?: string; init?: RequestInit } = {}
    const client = new LocalKeysGatewayClient({
      sessionStore: session,
      fetchImpl: async (url, init) => {
        captured.url = url as string
        captured.init = init
        return jsonRes(200, { keys: [] })
      },
    })
    client.setToken('tok-123')
    expect(session.getItem(SESSION_TOKEN_KEY)).toBe('tok-123')
    await client.list()
    expect(captured.url).toBe(`${DEFAULT_GATEWAY_URL}/keys`)
    const headers = captured.init?.headers as Record<string, string>
    expect(headers['authorization']).toBe('Bearer tok-123')
  })

  it('sends credentials: omit so site cookies do not leak', async () => {
    const session = memSession()
    let observed: RequestInit | undefined
    const client = new LocalKeysGatewayClient({
      sessionStore: session,
      fetchImpl: async (_url, init) => {
        observed = init
        return jsonRes(200, { keys: [] })
      },
    })
    client.setToken('tok')
    await client.list()
    expect(observed?.credentials).toBe('omit')
  })

  it('clears the token and raises gateway_not_paired on 401', async () => {
    const session = memSession()
    session.setItem(SESSION_TOKEN_KEY, 'tok')
    const client = new LocalKeysGatewayClient({
      sessionStore: session,
      fetchImpl: async () => new Response('', { status: 401 }),
    })
    let err: unknown
    try {
      await client.list()
    } catch (e) {
      err = e
    }
    expect((err as LocalKeyStoreError).code).toBe('gateway_not_paired')
    expect(session.getItem(SESSION_TOKEN_KEY)).toBeNull()
  })

  it('maps 403/429/404 to the right error codes', async () => {
    const make = (status: number) =>
      new LocalKeysGatewayClient({
        sessionStore: (() => {
          const s = memSession()
          s.setItem(SESSION_TOKEN_KEY, 'tok')
          return s
        })(),
        fetchImpl: async () => new Response('', { status }),
      })

    await expect(make(403).list()).rejects.toMatchObject({ code: 'gateway_forbidden' })
    await expect(make(429).list()).rejects.toMatchObject({ code: 'gateway_rate_limited' })
    await expect(make(404).resolve('abcd1234abcd1234abcd1234')).rejects.toMatchObject({
      code: 'key_not_found',
    })
  })

  it('does not write key material to sessionStorage on add()', async () => {
    const session = memSession()
    session.setItem(SESSION_TOKEN_KEY, 'tok')
    const client = new LocalKeysGatewayClient({
      sessionStore: session,
      fetchImpl: async () =>
        jsonRes(200, { key: { id: 'a'.repeat(24), provider: 'openai', label: 'L', createdAt: '' } }),
    })
    await client.add({ provider: 'openai', label: 'Test', rawKey: 'sk-NEVER-CACHED-XYZ' })
    for (const value of session.values()) {
      expect(value.includes('sk-NEVER-CACHED-XYZ')).toBe(false)
    }
  })

  it('resolve returns plaintext once and does not cache it', async () => {
    const session = memSession()
    session.setItem(SESSION_TOKEN_KEY, 'tok')
    let callCount = 0
    const client = new LocalKeysGatewayClient({
      sessionStore: session,
      fetchImpl: async () => {
        callCount += 1
        return jsonRes(200, { key: 'plaintext-once' })
      },
    })
    expect(await client.resolve('a'.repeat(24))).toBe('plaintext-once')
    expect(callCount).toBe(1)
    expect(await client.resolve('a'.repeat(24))).toBe('plaintext-once')
    expect(callCount).toBe(2)
    for (const value of session.values()) {
      expect(value.includes('plaintext-once')).toBe(false)
    }
  })

  it('healthCheck reports reachable=false when fetch rejects', async () => {
    const client = new LocalKeysGatewayClient({
      sessionStore: memSession(),
      fetchImpl: async () => {
        throw new Error('connect refused')
      },
    })
    expect(await client.healthCheck()).toEqual({ reachable: false, paired: false })
  })
})

describe('deriveGatewayUrl', () => {
  const originalWindow = (globalThis as { window?: unknown }).window
  const originalSession = (globalThis as { sessionStorage?: unknown }).sessionStorage

  function setBrowser(hostname: string, protocol = 'http:', storeOverride: string | null = null) {
    const store = new Map<string, string>()
    if (storeOverride) store.set(SESSION_GATEWAY_URL_KEY, storeOverride)
    ;(globalThis as { window: unknown }).window = { location: { hostname, protocol } }
    ;(globalThis as { sessionStorage: unknown }).sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    }
  }

  afterEach(() => {
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window
    else (globalThis as { window: unknown }).window = originalWindow
    if (originalSession === undefined) delete (globalThis as { sessionStorage?: unknown }).sessionStorage
    else (globalThis as { sessionStorage: unknown }).sessionStorage = originalSession
  })

  it('returns the loopback default in Node (no window)', () => {
    delete (globalThis as { window?: unknown }).window
    expect(deriveGatewayUrl()).toBe(DEFAULT_GATEWAY_URL)
  })

  it('returns the loopback default when served from localhost', () => {
    setBrowser('localhost')
    expect(deriveGatewayUrl()).toBe(DEFAULT_GATEWAY_URL)
  })

  it('returns the loopback default when served from 127.0.0.1', () => {
    setBrowser('127.0.0.1')
    expect(deriveGatewayUrl()).toBe(DEFAULT_GATEWAY_URL)
  })

  it('derives a Tailscale-IP gateway URL from window.location', () => {
    setBrowser('YOUR_TAILSCALE_IP', 'http:')
    expect(deriveGatewayUrl()).toBe('http://YOUR_TAILSCALE_IP:38080')
  })

  it('derives a LAN-IP gateway URL', () => {
    setBrowser('192.168.1.42', 'http:')
    expect(deriveGatewayUrl()).toBe('http://192.168.1.42:38080')
  })

  it('honors the sessionStorage override', () => {
    setBrowser('YOUR_TAILSCALE_IP', 'http:', 'https://custom.gateway:9000')
    expect(deriveGatewayUrl()).toBe('https://custom.gateway:9000')
  })
})
