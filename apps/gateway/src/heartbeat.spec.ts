import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { keychain } from '@lenserfight/utils/keychain'
import { generateEd25519Keypair } from '@lenserfight/utils/signing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { GatewayConfig } from './config'
import { buildHeartbeatPayload, sendHeartbeat } from './heartbeat'

let tempDir: string
let config: GatewayConfig
let keypair: { publicKey: string; privateKey: string }

beforeEach(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'lf-gateway-hb-'))
  keypair = generateEd25519Keypair()
  config = {
    bind: '127.0.0.1',
    port: 0,
    tailscale: false,
    keysOnly: false,
    stateDir: tempDir,
    keychainService: `lf-gateway-heartbeat-${Date.now()}`,
    daemonVersion: 'lf-gatewayd/test',
    heartbeatIntervalMs: 30_000,
    pullIntervalMs: 10_000,
    outboxFlushIntervalMs: 5_000,
    clockSkewLimitSeconds: 300,
  }
  await keychain.setSecret({
    service: config.keychainService,
    account: 'device:active',
    secret: keypair.privateKey,
  })
})

afterEach(async () => {
  await keychain
    .deleteSecret({ service: config.keychainService, account: 'device:active' })
    .catch(() => undefined)
  rmSync(tempDir, { recursive: true, force: true })
})

describe('buildHeartbeatPayload', () => {
  it('returns a payload with all required fields and a signature', async () => {
    const payload = await buildHeartbeatPayload(config, {
      device_id: '00000000-0000-0000-0000-000000000001',
      public_key: keypair.publicKey,
      hostname: 'test-host',
      daemon_version: 'lf-gatewayd/test',
    })

    expect(payload.device_id).toBe('00000000-0000-0000-0000-000000000001')
    expect(payload.public_key).toBe(keypair.publicKey)
    expect(payload.hostname).toBe('test-host')
    expect(payload.daemon_version).toBe('lf-gatewayd/test')
    expect(payload.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/)
    // Ed25519 signatures are 64 raw bytes — 86 chars in base64url (no padding).
    expect(payload.signature).toMatch(/^[A-Za-z0-9_-]{86,}$/)
  })

  it('throws when identity has no device_id', async () => {
    await expect(
      buildHeartbeatPayload(config, {
        // @ts-expect-error — explicit bad input
        device_id: undefined,
        public_key: keypair.publicKey,
        daemon_version: 'lf-gatewayd/test',
      })
    ).rejects.toThrow(/identity has no device_id/)
  })
})

describe('sendHeartbeat', () => {
  it('propagates kill_switch from the server response', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ approved: true, kill_switch: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })

    const result = await sendHeartbeat(
      config,
      {
        device_id: '00000000-0000-0000-0000-000000000001',
        public_key: keypair.publicKey,
        hostname: 'test-host',
        daemon_version: 'lf-gatewayd/test',
      },
      'https://example.supabase.co',
      'anon-key',
      { fetchImpl }
    )

    expect(result).toEqual({ approved: true, killSwitch: true })
  })
})
