/**
 * localKeyCrypto.ts
 *
 * AES-GCM 256-bit encryption/decryption for locally stored API keys.
 * Keys are stored encrypted in IndexedDB; the device CryptoKey is derived
 * from a per-browser salt stored in localStorage using PBKDF2.
 *
 * Security notes:
 * - The CryptoKey is non-extractable — it cannot be serialised.
 * - If localStorage is cleared, all local keys become unrecoverable.
 * - In private/incognito mode, the salt is session-only (in-memory fallback).
 */
import type { LocalKey } from '@lenserfight/types'

const SALT_STORAGE_KEY = 'lenserfight-device-salt'
const DB_NAME = 'lenserfight-local-keys'
const DB_VERSION = 1
const STORE_NAME = 'keys'

// Session-only fallback salt for private browsing
let sessionSalt: Uint8Array | null = null

function getOrCreateSalt(): Uint8Array {
  try {
    const stored = localStorage.getItem(SALT_STORAGE_KEY)
    if (stored) {
      return new Uint8Array(JSON.parse(stored) as number[])
    }
    const salt = crypto.getRandomValues(new Uint8Array(32))
    localStorage.setItem(SALT_STORAGE_KEY, JSON.stringify(Array.from(salt)))
    return salt
  } catch {
    // localStorage unavailable (private browsing)
    if (!sessionSalt) {
      sessionSalt = crypto.getRandomValues(new Uint8Array(32))
    }
    return sessionSalt
  }
}

let deviceKeyCache: CryptoKey | null = null

async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  if (deviceKeyCache) return deviceKeyCache

  const salt = getOrCreateSalt()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('lenserfight-local-byok'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  deviceKeyCache = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return deviceKeyCache
}

export async function encryptKey(rawKey: string): Promise<{ encryptedKey: ArrayBuffer; iv: Uint8Array }> {
  const deviceKey = await getOrCreateDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    deviceKey,
    new TextEncoder().encode(rawKey),
  )
  return { encryptedKey, iv }
}

export async function decryptKey(encryptedKey: ArrayBuffer, iv: Uint8Array): Promise<string> {
  const deviceKey = await getOrCreateDeviceKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    deviceKey,
    encryptedKey,
  )
  return new TextDecoder().decode(decrypted)
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

let dbCache: IDBDatabase | null = null

export function openLocalKeyDb(): Promise<IDBDatabase> {
  if (dbCache) return Promise.resolve(dbCache)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = () => {
      dbCache = req.result
      resolve(req.result)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveLocalKey(
  entry: Omit<LocalKey, 'id' | 'createdAt'>,
): Promise<LocalKey> {
  const db = await openLocalKeyDb()
  const full: LocalKey = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add(full)
    tx.oncomplete = () => resolve(full)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getLocalKeys(): Promise<LocalKey[]> {
  const db = await openLocalKeyDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as LocalKey[])
    req.onerror = () => reject(req.error)
  })
}

export async function getLocalKeyById(id: string): Promise<LocalKey | undefined> {
  const db = await openLocalKeyDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result as LocalKey | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteLocalKey(id: string): Promise<void> {
  const db = await openLocalKeyDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** True when localStorage is not available (private browsing) */
export function isPrivateBrowsing(): boolean {
  try {
    localStorage.getItem(SALT_STORAGE_KEY)
    return false
  } catch {
    return true
  }
}
