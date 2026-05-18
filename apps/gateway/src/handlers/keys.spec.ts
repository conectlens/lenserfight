import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { LocalKeyStore, PassphraseProvider } from '@lenserfight/data/local-keys'

import { BearerAuthGuard } from '../auth/bearer'
import type { GatewayConfig } from '../config'
import { startServer } from '../server'

const baseConfig: GatewayConfig = {
  bind: '127.0.0.1',
  port: 0,
  tailscale: false,
  keysOnly: false,
  stateDir: '/tmp/lf-gateway-test',
  keychainService: 'lenserfight-gateway-test',
  daemonVersion: 'test',
  heartbeatIntervalMs: 1,
  pullIntervalMs: 1,
  outboxFlushIntervalMs: 1,
  clockSkewLimitSeconds: 300,
}

function memKeychain(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}))
  const key = (s: string, a: string) => `${s}::${a}`
  return {
    getSecret: async (ref: { service: string; account: string }) => store.get(key(ref.service, ref.account)) ?? null,
    setSecret: async (ref: { service: string; account: string; secret: string }) => {
      store.set(key(ref.service, ref.account), ref.secret)
    },
    deleteSecret: async (ref: { service: string; account: string }) => store.delete(key(ref.service, ref.account)),
  }
}

async function bootstrap() {
  const dir = mkdtempSync(join(tmpdir(), 'lf-gateway-keys-'))
  const keychainStore = memKeychain()
  const env: NodeJS.ProcessEnv = {
    LENSERFIGHT_KEYS_DIR: join(dir, 'keys'),
  }
  const passphrases = new PassphraseProvider({ keychainAdapter: keychainStore, env })
  await passphrases.set('a-strong-test-passphrase-12345')
  const localKeyStore = new LocalKeyStore({ env, passphraseProvider: passphrases })
  const bearerAuth = new BearerAuthGuard({ keychainAdapter: keychainStore })
  const token = await bearerAuth.ensureToken()
  const server = await startServer(baseConfig, {
    daemonVersion: 'test',
    primaryBind: baseConfig.bind,
    localKeyStore,
    bearerAuth,
  })
  return { server, token, localKeyStore, bearerAuth }
}

describe('gateway /keys handlers', () => {
  let bag: Awaited<ReturnType<typeof bootstrap>>

  beforeEach(async () => {
    bag = await bootstrap()
  })

  afterEach(async () => {
    await bag.server.close()
  })

  it('GET /keys → 401 without Authorization', async () => {
    const r = await fetch(`${bag.server.url}/keys`)
    expect(r.status).toBe(401)
  })

  it('GET /keys → 401 with bad token', async () => {
    const r = await fetch(`${bag.server.url}/keys`, { headers: { authorization: 'Bearer wrong' } })
    expect(r.status).toBe(401)
  })

  it('GET /keys → 403 with forbidden Origin', async () => {
    const r = await fetch(`${bag.server.url}/keys`, {
      headers: { authorization: `Bearer ${bag.token}`, origin: 'https://evil.example' },
    })
    expect(r.status).toBe(403)
  })

  it('OPTIONS preflight returns 204 for allowed origin and 403 for disallowed', async () => {
    const good = await fetch(`${bag.server.url}/keys`, {
      method: 'OPTIONS',
      headers: { origin: 'https://lenserfight.com' },
    })
    expect(good.status).toBe(204)
    expect(good.headers.get('access-control-allow-origin')).toBe('https://lenserfight.com')

    const bad = await fetch(`${bag.server.url}/keys`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    })
    expect(bad.status).toBe(403)
    expect(bad.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('end-to-end add → list → resolve → remove', async () => {
    const headers = { authorization: `Bearer ${bag.token}`, 'content-type': 'application/json' }
    const created = await fetch(`${bag.server.url}/keys`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ provider: 'openai', label: 'Prod', rawKey: 'sk-test-XYZ' }),
    })
    expect(created.status).toBe(201)
    const createdBody = (await created.json()) as { key: { id: string } }
    expect(createdBody.key.id).toMatch(/^[A-Za-z0-9_-]{20,40}$/)

    const listed = await fetch(`${bag.server.url}/keys`, { headers })
    expect(listed.status).toBe(200)
    const listBody = (await listed.json()) as { keys: Array<{ id: string }> }
    expect(listBody.keys).toHaveLength(1)
    // No ciphertext or rawKey in list response
    const blob = JSON.stringify(listBody)
    expect(blob).not.toContain('sk-test-XYZ')
    expect(blob).not.toContain('ciphertext')

    const resolved = await fetch(`${bag.server.url}/keys/${createdBody.key.id}/resolve`, {
      method: 'POST',
      headers,
    })
    expect(resolved.status).toBe(200)
    expect(((await resolved.json()) as { key: string }).key).toBe('sk-test-XYZ')

    const removed = await fetch(`${bag.server.url}/keys/${createdBody.key.id}`, {
      method: 'DELETE',
      headers,
    })
    expect(removed.status).toBe(204)

    const after = await fetch(`${bag.server.url}/keys`, { headers })
    expect(((await after.json()) as { keys: unknown[] }).keys).toHaveLength(0)
  })

  it('POST /keys rejects extra fields (strict schema)', async () => {
    const r = await fetch(`${bag.server.url}/keys`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bag.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        label: 'L',
        rawKey: 'sk',
        evil: 'extra',
      }),
    })
    expect(r.status).toBe(400)
  })

  it('PUT /keys/:id with invalid id pattern → 404 (route mismatch)', async () => {
    const r = await fetch(`${bag.server.url}/keys/../etc/passwd`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${bag.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'x' }),
    })
    expect(r.status).toBe(404)
  })

  it('resolve refuses an unknown id with 404', async () => {
    const r = await fetch(`${bag.server.url}/keys/abcd1234abcd1234abcd1234/resolve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bag.token}` },
    })
    expect(r.status).toBe(404)
  })

  it('rate-limits resolve calls (low budget)', async () => {
    // Build a separate stack with rateLimitPerMinute=2 to keep test fast.
    const dir = mkdtempSync(join(tmpdir(), 'lf-rl-'))
    const keychainStore = memKeychain()
    const env: NodeJS.ProcessEnv = { LENSERFIGHT_KEYS_DIR: join(dir, 'keys') }
    const passphrases = new PassphraseProvider({ keychainAdapter: keychainStore, env })
    await passphrases.set('a-strong-test-passphrase-12345')
    const localKeyStore = new LocalKeyStore({ env, passphraseProvider: passphrases })
    const bearerAuth = new BearerAuthGuard({ keychainAdapter: keychainStore, rateLimitPerMinute: 2 })
    const token = await bearerAuth.ensureToken()
    const server = await startServer(baseConfig, {
      daemonVersion: 'test',
      primaryBind: baseConfig.bind,
      localKeyStore,
      bearerAuth,
    })
    try {
      const created = await fetch(`${server.url}/keys`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', label: 'L', rawKey: 'sk' }),
      })
      const { key } = (await created.json()) as { key: { id: string } }
      const hit = async () =>
        fetch(`${server.url}/keys/${key.id}/resolve`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        })
      expect((await hit()).status).toBe(200)
      expect((await hit()).status).toBe(200)
      expect((await hit()).status).toBe(429)
    } finally {
      await server.close()
    }
  })

  it('body size limit blocks oversized payloads', async () => {
    const big = 'x'.repeat(80 * 1024)
    const r = await fetch(`${bag.server.url}/keys`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bag.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', label: 'L', rawKey: big }),
    })
    expect(r.status).toBe(413)
  })
})
