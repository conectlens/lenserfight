import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ABSOLUTE_TTL_MS,
  GatewayPairingStore,
  PAIRING_RECORD_ID,
  ROLLING_TTL_MS,
} from '../src/lib/browser/pairing-store'

import type { GatewayPairingRecord, IdbAdapter } from '../src/lib/browser/pairing-store'

/** In-memory IdbAdapter — no DOM or fake-indexeddb required. */
class FakeIdbAdapter implements IdbAdapter {
  readonly store = new Map<string, GatewayPairingRecord>()

  async get(key: string): Promise<GatewayPairingRecord | undefined> {
    return this.store.get(key)
  }

  async put(value: GatewayPairingRecord): Promise<void> {
    this.store.set(value.pairingId, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

const FP = 'deadbeef01234567'

function makeStore() {
  const adapter = new FakeIdbAdapter()
  const store = new GatewayPairingStore(adapter)
  return { store, adapter }
}

describe('GatewayPairingStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── 1. First-time save ────────────────────────────────────────────────────

  it('save() writes a v:1 record with correct TTL fields and fingerprint', async () => {
    const { store, adapter } = makeStore()
    const now = Date.now()

    const record = await store.save('tok-abc', FP)

    expect(record.v).toBe(1)
    expect(record.pairingId).toBe(PAIRING_RECORD_ID)
    expect(record.token).toBe('tok-abc')
    expect(record.gatewayFingerprint).toBe(FP)
    expect(record.pairedAt).toBe(now)
    expect(record.expiresAt).toBe(now + ROLLING_TTL_MS)
    expect(record.absoluteExpiresAt).toBe(now + ABSOLUTE_TTL_MS)
    expect(record.lastVerifiedAt).toBe(now)

    // Confirm it was persisted to the adapter
    const raw = await adapter.get(PAIRING_RECORD_ID)
    expect(raw).toBeDefined()
    expect(raw?.token).toBe('tok-abc')
  })

  // ─── 2. Load valid record ──────────────────────────────────────────────────

  it('load() returns { status: "ok", record } for a fresh valid record', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    const result = await store.load(FP)

    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.record.token).toBe('tok-abc')
    }
  })

  // ─── 3. Load slides expiresAt ─────────────────────────────────────────────

  it('load() slides expiresAt by ROLLING_TTL_MS from now', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    // Advance 10 days
    vi.advanceTimersByTime(10 * 24 * 60 * 60 * 1000)
    const now = Date.now()

    const result = await store.load(FP)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.record.expiresAt).toBe(now + ROLLING_TTL_MS)
      expect(result.record.lastVerifiedAt).toBe(now)
    }
  })

  // ─── 4. Expired via rolling TTL ──────────────────────────────────────────

  it('load() returns { status: "expired" } and deletes record after 31 days', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    // Advance 31 days (past 30-day rolling TTL)
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000)

    const result = await store.load(FP)
    expect(result.status).toBe('expired')

    // Record must be gone
    const peeked = await store.peek()
    expect(peeked).toBeNull()
  })

  // ─── 5. Expired via absolute TTL ─────────────────────────────────────────

  it('load() returns { status: "expired" } and deletes record after 91 days', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    // Advance 91 days (past 90-day absolute TTL)
    vi.advanceTimersByTime(91 * 24 * 60 * 60 * 1000)

    const result = await store.load(FP)
    expect(result.status).toBe('expired')

    const peeked = await store.peek()
    expect(peeked).toBeNull()
  })

  // ─── 6. Fingerprint mismatch ──────────────────────────────────────────────

  it('load() returns { status: "mismatch" } and deletes record when fingerprint changes', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    const result = await store.load('different-fp-0987654321')
    expect(result.status).toBe('mismatch')

    // Record must be gone after mismatch
    const peeked = await store.peek()
    expect(peeked).toBeNull()
  })

  // ─── 7. Not found ─────────────────────────────────────────────────────────

  it('load() returns { status: "not_found" } when no record exists', async () => {
    const { store } = makeStore()

    const result = await store.load(FP)
    expect(result.status).toBe('not_found')
  })

  // ─── 8. Revoke ───────────────────────────────────────────────────────────

  it('revoke() deletes the record; peek() returns null afterwards', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    await store.revoke()

    const peeked = await store.peek()
    expect(peeked).toBeNull()
  })

  // ─── 9. Forget ───────────────────────────────────────────────────────────

  it('forget() deletes the record; peek() returns null afterwards', async () => {
    const { store } = makeStore()
    await store.save('tok-abc', FP)

    await store.forget()

    const peeked = await store.peek()
    expect(peeked).toBeNull()
  })

  // ─── 10. Save overwrites existing ────────────────────────────────────────

  it('save() overwrites an existing record with the new token', async () => {
    const { store } = makeStore()
    await store.save('tok-first', FP)

    // Advance a bit so we can verify pairedAt changes
    vi.advanceTimersByTime(5 * 60 * 1000)
    const secondSaveTime = Date.now()

    await store.save('tok-second', FP)

    const peeked = await store.peek()
    expect(peeked).not.toBeNull()
    expect(peeked?.token).toBe('tok-second')
    expect(peeked?.pairedAt).toBe(secondSaveTime)
  })
})
