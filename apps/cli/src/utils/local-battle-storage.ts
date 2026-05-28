// ─── Local Battle Storage ────────────────────────────────────────────────────
// Pure Fabrication: owns disk I/O for local battle JSON files with optional
// AES-256-GCM encryption at rest. Callers (LocalBattleStore) treat this as a
// drop-in JSON read/write boundary.
//
// Envelope format (v1):
//   {"v": 1, "alg": "aes-256-gcm", "data": "<base64(IV || ciphertext || tag)>"}
//
// IV is 12 bytes (random per write); auth tag is 16 bytes; key is 32 bytes
// derived once via scryptSync from process.env.LENSERFIGHT_LOCAL_BATTLE_KEY.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import consola from 'consola'

const ENV_VAR = 'LENSERFIGHT_LOCAL_BATTLE_KEY'
const KDF_SALT = 'lenserfight-local-battle-v1'
const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

interface EncryptedEnvelope {
  v: 1
  alg: 'aes-256-gcm'
  data: string
}

function isEnvelope(x: unknown): x is EncryptedEnvelope {
  if (!x || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return obj.v === 1 && obj.alg === ALG && typeof obj.data === 'string'
}

let cachedKey: Buffer | null = null

function deriveKey(): Buffer {
  if (cachedKey) return cachedKey
  const passphrase = process.env[ENV_VAR]
  if (!passphrase) {
    throw new Error(
      `Missing ${ENV_VAR}. Generate one with: lf config local-battle-key generate`
    )
  }
  cachedKey = scryptSync(passphrase, KDF_SALT, KEY_LEN)
  return cachedKey
}

/** Test-only hook to clear the cached key after env var changes. */
export function __resetLocalBattleKeyCacheForTests(): void {
  cachedKey = null
}

function encryptToEnvelope(plaintext: string): EncryptedEnvelope {
  const key = deriveKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const blob = Buffer.concat([iv, ct, tag])
  return { v: 1, alg: ALG, data: blob.toString('base64') }
}

function decryptEnvelope(env: EncryptedEnvelope): string {
  const key = deriveKey()
  const blob = Buffer.from(env.data, 'base64')
  if (blob.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Encrypted local battle file is truncated or corrupt.')
  }
  const iv = blob.subarray(0, IV_LEN)
  const tag = blob.subarray(blob.length - TAG_LEN)
  const ct = blob.subarray(IV_LEN, blob.length - TAG_LEN)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf-8')
}

/**
 * Write a JSON-serialisable payload to disk, encrypted under
 * LENSERFIGHT_LOCAL_BATTLE_KEY. If the env var is unset a clear error is
 * thrown — there is no plaintext fallback.
 */
export function writeBattleFile(path: string, payload: unknown): void {
  const json = JSON.stringify(payload, null, 2)
  const envelope = encryptToEnvelope(json)
  writeFileSync(path, JSON.stringify(envelope), 'utf-8')
}

/**
 * Read a battle file from disk. Detects the encrypted envelope; if the file
 * predates encryption (legacy plaintext JSON) the payload is decrypted in
 * place by re-writing the file under the encrypted envelope (a one-time
 * migration), with a consola warning.
 */
export function readBattleFile<T = unknown>(path: string): T {
  const raw = readFileSync(path, 'utf-8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Local battle file ${path} is not valid JSON: ${(err as Error).message}`)
  }

  if (isEnvelope(parsed)) {
    const plaintext = decryptEnvelope(parsed)
    return JSON.parse(plaintext) as T
  }

  // Legacy plaintext: migrate to encrypted format on read. If the user has
  // not set the env var we cannot encrypt; surface a warning but still
  // return the parsed payload so existing flows keep working.
  if (!process.env[ENV_VAR]) {
    consola.warn(
      'Local battle file %s is in legacy plaintext format. Set %s and re-read to migrate.',
      path,
      ENV_VAR
    )
    return parsed as T
  }

  try {
    const envelope = encryptToEnvelope(raw)
    writeFileSync(path, JSON.stringify(envelope), 'utf-8')
    consola.warn(
      'Migrated legacy plaintext battle file %s to encrypted format. Set %s before next read.',
      path,
      ENV_VAR
    )
  } catch (err) {
    consola.warn(
      'Failed to migrate %s to encrypted format: %s',
      path,
      (err as Error).message
    )
  }
  return parsed as T
}
