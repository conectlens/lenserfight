/**
 * Durable gateway pairing credential store backed by IndexedDB.
 *
 * ## Why IndexedDB (not localStorage, not sessionStorage)
 *
 * sessionStorage: dies with the tab — the UX problem we are solving.
 * localStorage: persists, but is a synchronous string-only store surfaced
 *   prominently in DevTools "Application → Local Storage", making raw secrets
 *   more likely to be accidentally exposed during support sessions or screen
 *   shares.
 * IndexedDB: async, origin-scoped, persists across tabs and browser restarts,
 *   supports structured objects, and is not shown in the "Local Storage" tab by
 *   default in DevTools. It does not provide encryption at rest; the same
 *   XSS-based origin-level threat model applies as with localStorage.
 *
 * ## What is stored
 *
 * The raw bearer token received from `lf gateway pair --web`. This is the MVP
 * approach — see GATEWAY_PAIRING.md for the v2 upgrade path that exchanges the
 * bootstrap token for a short-lived per-browser grant credential via a new
 * gateway `/auth/browser-grant` endpoint.
 *
 * ## Security properties added over raw sessionStorage
 *
 * - Rolling 30-day TTL (+ 90-day hard cap): credentials don't persist forever.
 * - Gateway identity fingerprint: SHA-256 of the Ed25519 public key returned by
 *   `GET /identity`. If the gateway is reinstalled (different keypair), the
 *   stored credential is rejected and re-pairing is required.
 * - Explicit "Forget this gateway" user action.
 * - Revocation on 401: gateway rejecting the token causes the stored record to
 *   be deleted immediately.
 */

import { openDB } from 'idb'

import type { IDBPDatabase } from 'idb'

export const PAIRING_DB_NAME = 'lf-gateway-pairing'
export const PAIRING_DB_VERSION = 1
export const PAIRING_STORE_NAME = 'pairings'

/**
 * Singleton key used for the one-and-only pairing record. We only support one
 * active gateway per browser origin, so storing a fixed key simplifies
 * get/put/delete without needing a separate "find current" query.
 */
export const PAIRING_RECORD_ID = 'default'

/** 30 days in milliseconds — rolling window restarted on each successful use. */
export const ROLLING_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** 90 days in milliseconds — hard cap, never refreshed. */
export const ABSOLUTE_TTL_MS = 90 * 24 * 60 * 60 * 1000

/**
 * The persisted pairing record. `v` is a schema version for forward
 * compatibility; bump PAIRING_DB_VERSION and add a migration if the shape
 * changes.
 *
 * NOTE: `token` stores the raw bearer credential in plaintext. This is the MVP
 * limitation. See GATEWAY_PAIRING.md §"Upgrade path (v2)" for how to replace
 * this with a gateway-issued browser grant credential.
 */
export interface GatewayPairingRecord {
  /** Schema version — always 1 in this implementation. */
  v: 1
  /** Fixed to `PAIRING_RECORD_ID`; serves as the IndexedDB keyPath value. */
  pairingId: string
  /** Raw bearer token. Treat as secret; never log. */
  token: string
  /**
   * SHA-256 hex digest of the gateway's Ed25519 public key (from `GET /identity`).
   * If the gateway daemon is reinstalled with a new keypair, this fingerprint
   * will no longer match and re-pairing will be required.
   *
   * The special value `'unknown'` is stored when the gateway was unreachable at
   * pairing time. On the next reconnect attempt where the gateway IS reachable,
   * the fingerprint mismatch will surface as `'mismatch'` → re-pair required.
   */
  gatewayFingerprint: string
  /** Unix ms when the pairing was first established. */
  pairedAt: number
  /**
   * Unix ms at which this record expires. Refreshed (sliding window) on each
   * successful `load()`. Capped at `absoluteExpiresAt`.
   */
  expiresAt: number
  /** Unix ms hard-cap expiry — never refreshed regardless of activity. */
  absoluteExpiresAt: number
  /** Unix ms of the last successful `load()` call (health-verified connection). */
  lastVerifiedAt: number
}

export type PairingLoadResult =
  | { status: 'ok'; record: GatewayPairingRecord }
  /** Record existed but the rolling or absolute TTL has passed. Record is deleted. */
  | { status: 'expired' }
  /**
   * Record exists but the gateway's Ed25519 public key has changed since pairing.
   * This means the gateway was reinstalled / identity rotated. Record is deleted.
   */
  | { status: 'mismatch' }
  /** No record exists in IndexedDB. */
  | { status: 'not_found' }

/**
 * Minimal IDB operations needed by `GatewayPairingStore`.
 *
 * Injected via the constructor for testability. In production the real
 * IndexedDB adapter is created automatically. In tests a `FakeIdbAdapter`
 * backed by a plain `Map` is passed instead, avoiding the need for a DOM
 * environment or `fake-indexeddb`.
 */
export interface IdbAdapter {
  get(key: string): Promise<GatewayPairingRecord | undefined>
  put(value: GatewayPairingRecord): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Create the real IndexedDB-backed adapter. Returns `null` when IndexedDB is
 * not available (SSR / Node test context without `fake-indexeddb`).
 */
function makeRealAdapter(): IdbAdapter | null {
  if (typeof indexedDB === 'undefined') return null

  // Lazily opened — we do not open the DB until the first read/write.
  let dbPromise: Promise<IDBPDatabase> | null = null

  function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
      dbPromise = openDB(PAIRING_DB_NAME, PAIRING_DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(PAIRING_STORE_NAME)) {
            db.createObjectStore(PAIRING_STORE_NAME, { keyPath: 'pairingId' })
          }
        },
      })
    }
    return dbPromise
  }

  return {
    async get(key: string): Promise<GatewayPairingRecord | undefined> {
      try {
        const db = await getDb()
        return (await db.get(PAIRING_STORE_NAME, key)) as GatewayPairingRecord | undefined
      } catch {
        return undefined
      }
    },
    async put(value: GatewayPairingRecord): Promise<void> {
      try {
        const db = await getDb()
        await db.put(PAIRING_STORE_NAME, value)
      } catch {
        // IDB write failure is non-fatal: the in-memory token remains valid for
        // this session. Persistence will be retried next time setToken() is called.
      }
    },
    async delete(key: string): Promise<void> {
      try {
        const db = await getDb()
        await db.delete(PAIRING_STORE_NAME, key)
      } catch {
        // Non-fatal: worst case the expired record lingers until expiry check removes it.
      }
    },
  }
}

/**
 * Manages a single durable pairing record between this browser origin and the
 * local LenserFight gateway daemon.
 *
 * All public methods are safe to call when IndexedDB is unavailable (SSR, tests
 * without a DOM) — they resolve immediately with safe no-op behavior.
 */
export class GatewayPairingStore {
  private readonly adapter: IdbAdapter | null

  constructor(adapter?: IdbAdapter) {
    // When no adapter is provided, create the real IndexedDB adapter.
    // `makeRealAdapter()` returns null in Node/SSR contexts.
    this.adapter = adapter !== undefined ? adapter : makeRealAdapter()
  }

  /**
   * Persist a new pairing credential. Overwrites any existing record.
   *
   * @param token - Raw bearer token from `lf gateway pair --web`.
   * @param gatewayFingerprint - SHA-256 hex of the gateway's Ed25519 public key.
   *   Pass `'unknown'` when the gateway is unreachable at pairing time — the
   *   mismatch will surface on the next reconnect when the gateway is reachable.
   */
  async save(token: string, gatewayFingerprint: string): Promise<GatewayPairingRecord> {
    const now = Date.now()
    const record: GatewayPairingRecord = {
      v: 1,
      pairingId: PAIRING_RECORD_ID,
      token,
      gatewayFingerprint,
      pairedAt: now,
      expiresAt: now + ROLLING_TTL_MS,
      absoluteExpiresAt: now + ABSOLUTE_TTL_MS,
      lastVerifiedAt: now,
    }
    await this.adapter?.put(record)
    return record
  }

  /**
   * Load the stored pairing record after validating TTL and gateway fingerprint.
   *
   * On success, slides the rolling `expiresAt` window and updates
   * `lastVerifiedAt`. On failure (expired, mismatch), the record is deleted
   * so subsequent `peek()` calls correctly return `null`.
   *
   * @param currentFingerprint - SHA-256 hex fingerprint computed from the live
   *   gateway's `/identity` response. Must match the stored fingerprint.
   */
  async load(currentFingerprint: string): Promise<PairingLoadResult> {
    if (!this.adapter) return { status: 'not_found' }

    const record = await this.adapter.get(PAIRING_RECORD_ID)
    if (!record) return { status: 'not_found' }

    const now = Date.now()

    if (now > record.absoluteExpiresAt || now > record.expiresAt) {
      await this.adapter.delete(PAIRING_RECORD_ID)
      return { status: 'expired' }
    }

    if (record.gatewayFingerprint !== currentFingerprint) {
      await this.adapter.delete(PAIRING_RECORD_ID)
      return { status: 'mismatch' }
    }

    // Slide the rolling window, capped at the absolute expiry.
    const updated: GatewayPairingRecord = {
      ...record,
      expiresAt: Math.min(now + ROLLING_TTL_MS, record.absoluteExpiresAt),
      lastVerifiedAt: now,
    }
    await this.adapter.put(updated)
    return { status: 'ok', record: updated }
  }

  /**
   * Return the raw stored record without validating TTL or fingerprint.
   * Useful for displaying pairing metadata in the UI (paired date, expiry).
   * Returns `null` when no record exists.
   */
  async peek(): Promise<GatewayPairingRecord | null> {
    if (!this.adapter) return null
    const record = await this.adapter.get(PAIRING_RECORD_ID)
    return record ?? null
  }

  /**
   * Update `expiresAt` (rolling window) and `lastVerifiedAt` after a
   * successful gateway request. Called internally by `load()`; exposed for
   * advanced callers that want to refresh the TTL without a full round-trip.
   */
  async touch(): Promise<void> {
    if (!this.adapter) return
    const record = await this.adapter.get(PAIRING_RECORD_ID)
    if (!record) return
    const now = Date.now()
    await this.adapter.put({
      ...record,
      expiresAt: Math.min(now + ROLLING_TTL_MS, record.absoluteExpiresAt),
      lastVerifiedAt: now,
    })
  }

  /**
   * Delete the stored pairing record because the gateway rejected the token
   * (HTTP 401). The next call to `load()` will return `{ status: 'not_found' }`.
   */
  async revoke(): Promise<void> {
    await this.adapter?.delete(PAIRING_RECORD_ID)
  }

  /**
   * Delete the stored pairing record at the user's explicit request
   * ("Forget this gateway"). Semantically equivalent to `revoke()` but
   * represents a voluntary user action rather than a security event.
   */
  async forget(): Promise<void> {
    await this.adapter?.delete(PAIRING_RECORD_ID)
  }
}
