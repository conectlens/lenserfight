// Batch 8 — loops.spec.ts
//
// Tests scheduleLoop and outboxFlush (the outbox loop body).
// Does NOT start real timers — uses vi.useFakeTimers() for interval control.

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { scheduleLoop } from './loops'
import { outboxFlush } from './sync'
import type { OutboxFlushOptions } from './sync'

// ─── scheduleLoop ─────────────────────────────────────────────────────────────

describe('scheduleLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the task after the configured interval', async () => {
    const task = vi.fn().mockResolvedValue(undefined)
    scheduleLoop('heartbeat', 30_000, task)

    expect(task).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('calls the task repeatedly on each interval', async () => {
    const task = vi.fn().mockResolvedValue(undefined)
    scheduleLoop('pull', 10_000, task)

    await vi.advanceTimersByTimeAsync(30_001)
    expect(task).toHaveBeenCalledTimes(3)
  })

  it('stop() prevents further ticks', async () => {
    const task = vi.fn().mockResolvedValue(undefined)
    const handle = scheduleLoop('outbox', 5_000, task)

    await vi.advanceTimersByTimeAsync(5_001)
    expect(task).toHaveBeenCalledTimes(1)

    handle.stop()
    await vi.advanceTimersByTimeAsync(20_000)
    // Still 1 — stop prevented further ticks
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('catches task errors and continues the loop', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockResolvedValue(undefined)

    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    scheduleLoop('test-loop', 1_000, task)

    await vi.advanceTimersByTimeAsync(2_001)
    expect(task).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })
})

// ─── outboxFlush ──────────────────────────────────────────────────────────────

function makeOutboxOptions(overrides: Partial<OutboxFlushOptions> = {}): OutboxFlushOptions {
  return {
    config: {
      bind: '127.0.0.1',
      port: 0,
      tailscale: false,
      keysOnly: false,
      stateDir: '/tmp/test-state',
      keychainService: 'lf-gateway-test',
      daemonVersion: 'lf-gatewayd/test',
      heartbeatIntervalMs:   30_000,
      pullIntervalMs:        10_000,
      outboxFlushIntervalMs:  5_000,
      clockSkewLimitSeconds:    300,
    },
    deviceId:   'device-test-uuid',
    publicKey:  'base64encodedpubkey==',
    supabaseUrl: 'https://test.supabase.co',
    anonKey:    'test-anon-key',
    takeBatch:  () => [],
    ...overrides,
  }
}

describe('outboxFlush', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns skipped=true when not the leader', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ holder_acquired: false }),
      text: () => Promise.resolve(''),
    }))

    const result = await outboxFlush(makeOutboxOptions())

    expect(result).toEqual({ skipped: true })
  })

  it('returns skipped=true when leader but takeBatch returns empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ holder_acquired: true }),
      text: () => Promise.resolve(''),
    }))

    const result = await outboxFlush(makeOutboxOptions({ takeBatch: () => [] }))

    expect(result).toEqual({ skipped: true })
  })

  it('throws when leader lease RPC returns non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     false,
      status: 503,
      text:   () => Promise.resolve('Service Unavailable'),
      json:   () => Promise.reject(new Error('not json')),
    }))

    await expect(outboxFlush(makeOutboxOptions())).rejects.toThrow('503')
  })

  it('calls fn_acquire_leader_lease with correct params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ holder_acquired: false }),
      text: () => Promise.resolve(''),
    })
    vi.stubGlobal('fetch', mockFetch)

    await outboxFlush(makeOutboxOptions({ deviceId: 'my-device-id' }))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('fn_acquire_leader_lease'),
      expect.objectContaining({
        body: JSON.stringify({ p_lease_kind: 'sync_flush', p_device_id: 'my-device-id', p_lease_seconds: 30 }),
      }),
    )
  })
})
