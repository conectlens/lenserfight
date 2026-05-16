/**
 * localKeyCrypto.ts
 *
 * AES-GCM-256 encryption for locally stored API keys.
 *
 * Built on @noble/ciphers (audited, MIT, the same primitives Bitwarden's web
 * vault and MetaMask use). Noble runs in any browser context — secure or not —
 * so the lab works at production HTTPS origins, `localhost`, and over plain HTTP
 * on private-network dev hosts (Tailscale IPs, intranet hostnames, etc.) where
 * `crypto.subtle` is undefined.
 *
 * Wire format is byte-for-byte compatible with WebCrypto AES-GCM-128 output
 * (`ciphertext || 16-byte auth tag`, 12-byte IV), so existing keys encrypted by
 * an older WebCrypto-only build still decrypt cleanly.
 *
 * THREAT MODEL — READ BEFORE MODIFYING
 * ────────────────────────────────────────────────────────────────────────────
 * SAME-ORIGIN CONFIDENTIALITY ONLY. This module is NOT a defence against XSS
 * or compromised browser extensions running on this origin.
 *
 * What it DOES protect against:
 *   - Casual read of IndexedDB via devtools without running JS on the origin
 *   - File-system inspection of the browser profile (data at rest)
 *   - Accidental exposure via copy-paste of raw values
 *
 * What it does NOT protect against:
 *   - Any JavaScript running on the same origin (XSS) — defence-in-depth here
 *     is a strong CSP on the hosting app, NOT this module.
 *   - Malicious browser extensions with access to the origin.
 *   - A determined attacker with code-execution in the page.
 *
 * Design choices:
 *   - Salt lives in IndexedDB (NOT localStorage) so it is not part of the
 *     same surface area as `localStorage.getItem` and is NOT included in
 *     browser-account sync (Chrome Sync / Firefox Sync).
 *   - The PBKDF2 password is a constant — adding a per-user passphrase is
 *     possible but introduces friction; the protection under XSS is the
 *     same either way because the attacker can prompt for it.
 *   - Module-level CryptoKey caching is kept (perf), with an idle TTL so a
 *     long-lived tab does not keep the key indefinitely warm.
 */
import { gcm } from '@noble/ciphers/aes.js'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'

import type { LocalKey } from '@lenserfight/types'

const DB_NAME = 'lenserfight-local-keys'
const DB_VERSION = 2
const KEY_STORE = 'keys'
const META_STORE = 'meta'
const SALT_META_KEY = 'device-salt'

// How long the derived key stays in memory after last use. After this window
// the cache is cleared and the next operation re-derives it via PBKDF2.
const DEVICE_KEY_IDLE_TTL_MS = 5 * 60 * 1000

const PBKDF2_ITERATIONS = 200_000
const AES_KEY_BYTES = 32
const IV_BYTES = 12

// Session-only fallback salt if IndexedDB is unavailable (aggressive privacy
// modes). Lives only as long as the JS heap.
let sessionSalt: Uint8Array | null = null

let dbCache: IDBDatabase | null = null

function openLocalKeyDbInternal(): Promise<IDBDatabase> {
  if (dbCache) return Promise.resolve(dbCache)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }
      // v1 -> v2: previous version was missing META_STORE; no key data is lost.
      void event
    }
    req.onsuccess = () => {
      dbCache = req.result
      resolve(req.result)
    }
    req.onerror = () => reject(req.error)
  })
}

async function getSaltFromMeta(db: IDBDatabase): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly')
    const req = tx.objectStore(META_STORE).get(SALT_META_KEY)
    req.onsuccess = () => {
      const value = req.result as ArrayBuffer | Uint8Array | undefined
      if (!value) return resolve(null)
      resolve(value instanceof Uint8Array ? value : new Uint8Array(value))
    }
    req.onerror = () => reject(req.error)
  })
}

async function putSaltInMeta(db: IDBDatabase, salt: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite')
    tx.objectStore(META_STORE).put(salt, SALT_META_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// `crypto.getRandomValues` is available in every browsing context (it is NOT
// gated by secure-context, unlike `crypto.subtle`).
function getRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  crypto.getRandomValues(out)
  return out
}

// `crypto.randomUUID` is only universally available in secure contexts;
// fall back to RFC 4122 v4 from `getRandomValues` everywhere else.
function randomUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // fall through
    }
  }
  const b = getRandomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = Array.from(b, (n) => n.toString(16).padStart(2, '0'))
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  )
}

async function getOrCreateSalt(): Promise<Uint8Array> {
  try {
    const db = await openLocalKeyDbInternal()
    const existing = await getSaltFromMeta(db)
    if (existing) return existing
    const salt = getRandomBytes(32)
    await putSaltInMeta(db, salt)
    return salt
  } catch {
    // IndexedDB unavailable; degrade to in-memory salt (lost on tab close).
    if (!sessionSalt) {
      sessionSalt = getRandomBytes(32)
    }
    return sessionSalt
  }
}

let deviceKeyCache: Uint8Array | null = null
let deviceKeyExpiresAt = 0
let deviceKeyTimer: ReturnType<typeof setTimeout> | null = null

function scheduleDeviceKeyEviction() {
  if (deviceKeyTimer) clearTimeout(deviceKeyTimer)
  deviceKeyTimer = setTimeout(() => {
    deviceKeyCache = null
    deviceKeyTimer = null
  }, DEVICE_KEY_IDLE_TTL_MS)
}

/** Test/security hook: forcibly clear the in-memory derived key. */
export function clearDeviceKeyCache(): void {
  deviceKeyCache = null
  deviceKeyExpiresAt = 0
  if (deviceKeyTimer) {
    clearTimeout(deviceKeyTimer)
    deviceKeyTimer = null
  }
}

const PASSWORD_BYTES = new TextEncoder().encode('lenserfight-local-byok')

async function getOrCreateDeviceKey(): Promise<Uint8Array> {
  if (deviceKeyCache && Date.now() < deviceKeyExpiresAt) {
    deviceKeyExpiresAt = Date.now() + DEVICE_KEY_IDLE_TTL_MS
    scheduleDeviceKeyEviction()
    return deviceKeyCache
  }

  const salt = await getOrCreateSalt()
  deviceKeyCache = await pbkdf2Async(sha256, PASSWORD_BYTES, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: AES_KEY_BYTES,
  })
  deviceKeyExpiresAt = Date.now() + DEVICE_KEY_IDLE_TTL_MS
  scheduleDeviceKeyEviction()
  return deviceKeyCache
}

export async function encryptKey(
  rawKey: string,
): Promise<{ encryptedKey: ArrayBuffer; iv: Uint8Array }> {
  const deviceKey = await getOrCreateDeviceKey()
  const iv = getRandomBytes(IV_BYTES)
  const ciphertext = gcm(deviceKey, iv).encrypt(new TextEncoder().encode(rawKey))
  // Detach into a standalone ArrayBuffer to preserve the existing storage shape.
  const buf = new ArrayBuffer(ciphertext.byteLength)
  new Uint8Array(buf).set(ciphertext)
  return { encryptedKey: buf, iv }
}

export async function decryptKey(encryptedKey: ArrayBuffer, iv: Uint8Array): Promise<string> {
  const deviceKey = await getOrCreateDeviceKey()
  const decrypted = gcm(deviceKey, iv).decrypt(new Uint8Array(encryptedKey))
  return new TextDecoder().decode(decrypted)
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

export function openLocalKeyDb(): Promise<IDBDatabase> {
  return openLocalKeyDbInternal()
}

export async function saveLocalKey(
  entry: Omit<LocalKey, 'id' | 'createdAt'>,
): Promise<LocalKey> {
  const db = await openLocalKeyDb()
  const full: LocalKey = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite')
    tx.objectStore(KEY_STORE).add(full)
    tx.oncomplete = () => resolve(full)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getLocalKeys(): Promise<LocalKey[]> {
  const db = await openLocalKeyDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).getAll()
    req.onsuccess = () => resolve(req.result as LocalKey[])
    req.onerror = () => reject(req.error)
  })
}

export async function getLocalKeyById(id: string): Promise<LocalKey | undefined> {
  const db = await openLocalKeyDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(id)
    req.onsuccess = () => resolve(req.result as LocalKey | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function updateLocalKey(id: string, rawKey: string, label: string): Promise<void> {
  const db = await openLocalKeyDb()
  const existing: LocalKey | undefined = await new Promise((resolve, reject) => {
    const req = db.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(id)
    req.onsuccess = () => resolve(req.result as LocalKey | undefined)
    req.onerror = () => reject(req.error)
  })
  if (!existing) throw new Error(`Local key not found: ${id}`)
  const { encryptedKey, iv } = await encryptKey(rawKey)
  const updated: LocalKey = { ...existing, encryptedKey, iv, label }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite')
    tx.objectStore(KEY_STORE).put(updated)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteLocalKey(id: string): Promise<void> {
  const db = await openLocalKeyDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite')
    tx.objectStore(KEY_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** True when IndexedDB is not available (very restrictive privacy modes). */
export function isPrivateBrowsing(): boolean {
  try {
    if (typeof indexedDB === 'undefined') return true
    return false
  } catch {
    return true
  }
}
