import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { canonicalize, ed25519Sign, generateEd25519Keypair } from '@lenserfight/utils/signing'

import type { GatewayConfig } from './config'
import {
  ackCommands,
  dispatchCommand,
  pullCommands,
  verifyCommandSignature,
  type GatewayCommand,
} from './sync'

function makeConfig(): GatewayConfig {
  return {
    bind: '127.0.0.1',
    port: 0,
    tailscale: false,
    keysOnly: false,
    stateDir: mkdtempSync(path.join(tmpdir(), 'lf-gateway-sync-')),
    keychainService: `lf-gateway-sync-${Date.now()}`,
    daemonVersion: 'lf-gatewayd/test',
    heartbeatIntervalMs: 30_000,
    pullIntervalMs: 10_000,
    outboxFlushIntervalMs: 5_000,
    clockSkewLimitSeconds: 300,
  }
}

describe('pullCommands', () => {
  it('returns [] when the cloud has nothing to dispatch', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } })
    const result = await pullCommands('dev-1', 'https://example.supabase.co', 'anon', { fetchImpl })
    expect(result).toEqual([])
  })

  it('returns the array of commands the cloud responded with', async () => {
    const cmd: GatewayCommand = {
      id: 'cmd-1',
      device_id: 'dev-1',
      command_type: 'config_push',
      payload: { hello: 'world' },
      created_at: '2026-01-01T00:00:00Z',
      claimed_at: '2026-01-01T00:00:01Z',
      acked_at: null,
    }
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify([cmd]), { status: 200, headers: { 'content-type': 'application/json' } })
    const result = await pullCommands('dev-1', 'https://example.supabase.co', 'anon', { fetchImpl })
    expect(result).toHaveLength(1)
    expect(result[0].command_type).toBe('config_push')
  })
})

describe('dispatchCommand', () => {
  it('writes payload to pushed-config.json for config_push and acks', async () => {
    const config = makeConfig()
    try {
      const ackFetch = vi.fn().mockResolvedValue(
        new Response('1', { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const cmd: GatewayCommand = {
        id: 'cmd-1',
        device_id: 'dev-1',
        command_type: 'config_push',
        payload: { feature_flags: { foo: true } },
        created_at: '',
        claimed_at: null,
        acked_at: null,
      }
      await dispatchCommand(cmd, {
        config,
        supabaseUrl: 'https://example.supabase.co',
        anonKey: 'anon',
        fetchImpl: ackFetch as unknown as typeof fetch,
        exit: () => undefined,
      })
      expect(ackFetch).toHaveBeenCalledOnce()
      const written = await import('node:fs/promises').then((m) =>
        m.readFile(path.join(config.stateDir, 'pushed-config.json'), 'utf8')
      )
      expect(JSON.parse(written)).toEqual({ feature_flags: { foo: true } })
    } finally {
      rmSync(config.stateDir, { recursive: true, force: true })
    }
  })

  it('invokes the exit hook on kill_switch', async () => {
    const config = makeConfig()
    try {
      const ackFetch = vi.fn().mockResolvedValue(new Response('1', { status: 200 }))
      const exit = vi.fn()
      await dispatchCommand(
        {
          id: 'cmd-2',
          device_id: 'dev-1',
          command_type: 'kill_switch',
          payload: {},
          created_at: '',
          claimed_at: null,
          acked_at: null,
        },
        {
          config,
          supabaseUrl: 'https://example.supabase.co',
          anonKey: 'anon',
          fetchImpl: ackFetch as unknown as typeof fetch,
          exit,
        }
      )
      expect(exit).toHaveBeenCalledWith(0)
    } finally {
      rmSync(config.stateDir, { recursive: true, force: true })
    }
  })

  it('logs and acks unknown command types without throwing', async () => {
    const config = makeConfig()
    try {
      const ackFetch = vi.fn().mockResolvedValue(new Response('1', { status: 200 }))
      await expect(
        dispatchCommand(
          {
            id: 'cmd-3',
            device_id: 'dev-1',
            command_type: 'never_seen',
            payload: {},
            created_at: '',
            claimed_at: null,
            acked_at: null,
          },
          {
            config,
            supabaseUrl: 'https://example.supabase.co',
            anonKey: 'anon',
            fetchImpl: ackFetch as unknown as typeof fetch,
            exit: () => undefined,
          }
        )
      ).resolves.toBeUndefined()
      expect(ackFetch).toHaveBeenCalled()
    } finally {
      rmSync(config.stateDir, { recursive: true, force: true })
    }
  })
})

describe('ackCommands', () => {
  it('short-circuits and returns 0 when there are no ids', async () => {
    const fetchImpl = vi.fn()
    const count = await ackCommands([], 'https://example.supabase.co', 'anon', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(count).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('verifyCommandSignature (Phase BG)', () => {
  let originalEnv: string | undefined
  beforeEach(() => {
    originalEnv = process.env['LF_GATEWAY_SKIP_SIG_VERIFY']
    delete process.env['LF_GATEWAY_SKIP_SIG_VERIFY']
  })
  afterEach(() => {
    if (originalEnv === undefined) delete process.env['LF_GATEWAY_SKIP_SIG_VERIFY']
    else process.env['LF_GATEWAY_SKIP_SIG_VERIFY'] = originalEnv
  })

  function makeSigned(): { cmd: GatewayCommand; publicKey: string } {
    const kp = generateEd25519Keypair()
    const cmd: GatewayCommand = {
      id: 'cmd-sig',
      device_id: 'dev-1',
      command_type: 'config_push',
      payload: { feature_flags: { foo: true } },
      created_at: '2026-01-01T00:00:00Z',
      claimed_at: null,
      acked_at: null,
      envelope_nonce: 'AAAAAAAAAAAAAAAAAAAAAA',
    }
    const canonical = canonicalize({
      id: cmd.id,
      device_id: cmd.device_id,
      command_type: cmd.command_type,
      payload: cmd.payload,
      created_at: cmd.created_at,
      envelope_nonce: cmd.envelope_nonce,
    })
    cmd.envelope_sig = ed25519Sign(kp.privateKey, Buffer.from(canonical, 'utf8'))
    return { cmd, publicKey: kp.publicKey }
  }

  it('accepts a properly signed envelope', () => {
    const { cmd, publicKey } = makeSigned()
    expect(verifyCommandSignature(cmd, publicKey)).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const { cmd, publicKey } = makeSigned()
    cmd.payload = { feature_flags: { foo: false } }
    expect(verifyCommandSignature(cmd, publicKey)).toBe(false)
  })

  it('rejects an unsigned command when a public key is configured', () => {
    const kp = generateEd25519Keypair()
    const cmd: GatewayCommand = {
      id: 'cmd-unsigned',
      device_id: 'dev-1',
      command_type: 'noop',
      payload: {},
      created_at: '2026-01-01T00:00:00Z',
      claimed_at: null,
      acked_at: null,
    }
    expect(verifyCommandSignature(cmd, kp.publicKey)).toBe(false)
  })

  it('accepts an unsigned command when no public key is configured (legacy)', () => {
    const cmd: GatewayCommand = {
      id: 'cmd-legacy',
      device_id: 'dev-1',
      command_type: 'noop',
      payload: {},
      created_at: '2026-01-01T00:00:00Z',
      claimed_at: null,
      acked_at: null,
    }
    expect(verifyCommandSignature(cmd, null)).toBe(true)
  })

  it('bypasses verification when LF_GATEWAY_SKIP_SIG_VERIFY=true', () => {
    process.env['LF_GATEWAY_SKIP_SIG_VERIFY'] = 'true'
    const cmd: GatewayCommand = {
      id: 'cmd-skip',
      device_id: 'dev-1',
      command_type: 'noop',
      payload: {},
      created_at: '2026-01-01T00:00:00Z',
      claimed_at: null,
      acked_at: null,
      envelope_sig: 'not-a-real-sig',
    }
    expect(verifyCommandSignature(cmd, 'whatever')).toBe(true)
  })

  it('dispatchCommand acks + drops a command with an invalid sig', async () => {
    const config = makeConfig()
    try {
      const ackFetch = vi.fn().mockResolvedValue(new Response('1', { status: 200 }))
      const exit = vi.fn()
      await dispatchCommand(
        {
          id: 'cmd-bad-sig',
          device_id: 'dev-1',
          command_type: 'kill_switch',
          payload: {},
          created_at: '',
          claimed_at: null,
          acked_at: null,
          envelope_sig: 'invalid',
        },
        {
          config,
          supabaseUrl: 'https://example.supabase.co',
          anonKey: 'anon',
          fetchImpl: ackFetch as unknown as typeof fetch,
          exit,
          cloudSigningPubKeyB64: generateEd25519Keypair().publicKey,
        }
      )
      // ack was called but exit (kill_switch side-effect) was NOT.
      expect(ackFetch).toHaveBeenCalled()
      expect(exit).not.toHaveBeenCalled()
    } finally {
      rmSync(config.stateDir, { recursive: true, force: true })
    }
  })
})
