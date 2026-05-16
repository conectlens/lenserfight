import { describe, expect, it } from 'vitest'

import type { GatewayConfig } from './config'
import { startServer } from './server'

const config: GatewayConfig = {
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

describe('startServer', () => {
  it('serves health and peers endpoints', async () => {
    const server = await startServer(config, {
      daemonVersion: 'test/1',
      primaryBind: config.bind,
      deviceId: 'device-1',
      onPeerLookup: async () => [{ id: 'peer-1' }],
    })

    try {
      const health = await fetch(`${server.url}/healthz`).then((r) => r.json())
      const peers = await fetch(`${server.url}/peers`).then((r) => r.json())

      expect(health).toMatchObject({
        status: 'ok',
        device_id: 'device-1',
        daemon_version: 'test/1',
      })
      expect(peers).toEqual({
        peers: [{ id: 'peer-1' }],
        peer_discovery: 'primary',
      })
    } finally {
      await server.close()
    }
  })

  it('serves identity (public_key only, no private key)', async () => {
    const server = await startServer(config, {
      daemonVersion: 'test/1',
      primaryBind: config.bind,
      onIdentityRead: async () => ({
        public_key: 'BASE64PUBLICKEY',
        generated_at: '2026-05-12T00:00:00.000Z',
        daemon_version: 'test/1',
      }),
    })
    try {
      const res = await fetch(`${server.url}/identity`)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        public_key: 'BASE64PUBLICKEY',
        generated_at: '2026-05-12T00:00:00.000Z',
        daemon_version: 'test/1',
      })
      expect(JSON.stringify(json)).not.toContain('private')
    } finally {
      await server.close()
    }
  })

  it('refuses extra public binds', async () => {
    await expect(
      startServer(config, {
        daemonVersion: 'test/1',
        primaryBind: config.bind,
        extraBinds: ['0.0.0.0'],
      })
    ).rejects.toThrow('public_bind_forbidden')
  })

  it('binds loopback plus a second loopback address and closes all listeners', async () => {
    const server = await startServer(config, {
      daemonVersion: 'test/2',
      primaryBind: config.bind,
      extraBinds: ['127.0.0.2'],
      onPeerLookup: async () => [{ id: 'would-leak' }],
    })

    try {
      const primary = new URL(server.url)
      const port = primary.port
      expect(server.extraUrls).toEqual([`http://127.0.0.2:${port}`])

      const healthPrimary = await fetch(`${server.url}/healthz`).then((r) => r.json())
      const healthExtra = await fetch(`http://127.0.0.2:${port}/healthz`).then((r) => r.json())
      expect(healthPrimary.status).toBe('ok')
      expect(healthExtra.status).toBe('ok')

      const peersPrimary = await fetch(`${server.url}/peers`).then((r) => r.json())
      const peersExtra = await fetch(`http://127.0.0.2:${port}/peers`).then((r) => r.json())
      expect(peersPrimary.peers).toEqual([{ id: 'would-leak' }])
      expect(peersPrimary.peer_discovery).toBe('primary')
      expect(peersExtra.peers).toEqual([])
      expect(peersExtra.peer_discovery).toBe('primary_bind_only')
    } finally {
      await server.close()
    }
  })

  it('returns Access-Control-Allow-Origin on /healthz for allowed origins', async () => {
    // Regression: the browser's `LocalKeysGatewayClient.healthCheck()` calls
    // /healthz cross-origin *before* pairing, so the response must include
    // ACAO or the browser rejects it with "CORS request did not succeed".
    const server = await startServer(config, {
      daemonVersion: 'test/1',
      primaryBind: config.bind,
    })
    try {
      const res = await fetch(`${server.url}/healthz`, {
        headers: { origin: 'https://lenserfight.com' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('access-control-allow-origin')).toBe('https://lenserfight.com')
      expect(res.headers.get('vary')).toBe('origin')
    } finally {
      await server.close()
    }
  })

  it('omits ACAO on /healthz when the origin is disallowed', async () => {
    const server = await startServer(config, {
      daemonVersion: 'test/1',
      primaryBind: config.bind,
    })
    try {
      const res = await fetch(`${server.url}/healthz`, {
        headers: { origin: 'https://evil.example' },
      })
      // The server still answers (CORS is a browser-side guard), but no ACAO
      // header is set — the browser will block the response from JS.
      expect(res.status).toBe(200)
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    } finally {
      await server.close()
    }
  })

  it('handles OPTIONS preflight for /healthz (allowed origin → 204)', async () => {
    const server = await startServer(config, {
      daemonVersion: 'test/1',
      primaryBind: config.bind,
    })
    try {
      const res = await fetch(`${server.url}/healthz`, {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:4200' },
      })
      expect(res.status).toBe(204)
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:4200')
    } finally {
      await server.close()
    }
  })
})
