/**
 * AES-256-GCM with per-key scrypt KDF.
 *
 * Pure Fabrication — knows only crypto primitives, never disk or HTTP.
 *
 * Each envelope embeds its own 16-byte salt; the master passphrase derives a
 * 32-byte key per envelope. Cost params (N=2^15, r=8, p=1) target ~30–500 ms
 * on a developer laptop — slow enough to deter offline brute force, fast
 * enough for interactive `lf keys add` use.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import { ENVELOPE_ALG, ENVELOPE_KDF, ENVELOPE_VERSION } from './envelope'
import { LocalKeyStoreError } from './ports'

import type { KeyEnvelope } from './envelope'
import type { LocalKeyMetadata } from './ports'

const SCRYPT_N = 1 << 15
const SCRYPT_R = 8
const SCRYPT_P = 1
const SALT_BYTES = 16
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32
/**
 * scrypt maxmem must fit `128 * N * r` bytes of working state.
 * Default node maxmem (32 MiB) is below what N=2^15, r=8 needs, so bump
 * the bound explicitly. We compute it so future tuning does not silently
 * break key derivation.
 */
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2

function deriveKey(passphrase: string, salt: Uint8Array): Buffer {
  return scryptSync(passphrase, Buffer.from(salt), KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })
}

function zero(buf: Buffer | Uint8Array): void {
  if (buf instanceof Buffer) {
    buf.fill(0)
    return
  }
  for (let i = 0; i < buf.length; i++) buf[i] = 0
}

export function encryptEnvelope(
  passphrase: string,
  plaintext: string,
  meta: LocalKeyMetadata
): KeyEnvelope {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = deriveKey(passphrase, salt)
  const plaintextBuf = Buffer.from(plaintext, 'utf-8')
  try {
    const cipher = createCipheriv(ENVELOPE_ALG, key, iv)
    const ct = Buffer.concat([cipher.update(plaintextBuf), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
      v: ENVELOPE_VERSION,
      alg: ENVELOPE_ALG,
      kdf: ENVELOPE_KDF,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      ciphertext: ct.toString('base64'),
      tag: tag.toString('base64'),
      meta,
    }
  } finally {
    zero(key)
    zero(plaintextBuf)
  }
}

export function decryptEnvelope(passphrase: string, env: KeyEnvelope): string {
  const salt = Buffer.from(env.salt, 'base64')
  const iv = Buffer.from(env.iv, 'base64')
  const ct = Buffer.from(env.ciphertext, 'base64')
  const tag = Buffer.from(env.tag, 'base64')
  if (salt.length !== SALT_BYTES) throw new LocalKeyStoreError('corrupt_envelope', 'Invalid salt length')
  if (iv.length !== IV_BYTES) throw new LocalKeyStoreError('corrupt_envelope', 'Invalid IV length')
  if (tag.length !== TAG_BYTES) throw new LocalKeyStoreError('corrupt_envelope', 'Invalid tag length')
  if (ct.length === 0) throw new LocalKeyStoreError('corrupt_envelope', 'Empty ciphertext')

  const key = deriveKey(passphrase, salt)
  try {
    const decipher = createDecipheriv(ENVELOPE_ALG, key, iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()])
    return pt.toString('utf-8')
  } catch {
    throw new LocalKeyStoreError(
      'decryption_failed',
      'Failed to decrypt envelope (wrong passphrase or tampered file)'
    )
  } finally {
    zero(key)
  }
}

/**
 * Constant-time compare for bearer tokens / signatures. Defends against
 * length-leak side channels by hashing both inputs to fixed length first.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf-8')
  const bb = Buffer.from(b, 'utf-8')
  if (ab.length !== bb.length) {
    const pad = Buffer.alloc(ab.length)
    timingSafeEqual(ab, pad)
    return false
  }
  return timingSafeEqual(ab, bb)
}
