/**
 * On-disk envelope schema for local BYOK keys.
 *
 * One file per key at `~/.lenserfight/keys/<id>.json`. Each file is a JSON
 * envelope describing the AES-256-GCM ciphertext and metadata. Plaintext
 * never appears on disk. Tampering with any field flips the auth tag and
 * `decryptEnvelope()` will refuse the file.
 */

import { LocalKeyStoreError } from './ports'

import type { LocalKeyMetadata } from './ports'

export const ENVELOPE_VERSION = 1
export const ENVELOPE_ALG = 'aes-256-gcm' as const
export const ENVELOPE_KDF = 'scrypt' as const

export interface KeyEnvelope {
  v: 1
  alg: 'aes-256-gcm'
  kdf: 'scrypt'
  /** base64; 16 bytes per-key KDF salt */
  salt: string
  /** base64; 12 bytes GCM IV */
  iv: string
  /** base64; ciphertext bytes only (no tag) */
  ciphertext: string
  /** base64; 16 bytes auth tag */
  tag: string
  meta: LocalKeyMetadata
}

function isBase64(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value)
}

function isMeta(value: unknown): value is LocalKeyMetadata {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return (
    typeof m['id'] === 'string' &&
    typeof m['provider'] === 'string' &&
    typeof m['label'] === 'string' &&
    typeof m['createdAt'] === 'string'
  )
}

export function isKeyEnvelope(value: unknown): value is KeyEnvelope {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return (
    e['v'] === ENVELOPE_VERSION &&
    e['alg'] === ENVELOPE_ALG &&
    e['kdf'] === ENVELOPE_KDF &&
    isBase64(e['salt']) &&
    isBase64(e['iv']) &&
    isBase64(e['ciphertext']) &&
    isBase64(e['tag']) &&
    isMeta(e['meta'])
  )
}

export function parseEnvelopeJson(raw: string): KeyEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new LocalKeyStoreError('corrupt_envelope', 'Envelope is not valid JSON')
  }
  if (!isKeyEnvelope(parsed)) {
    throw new LocalKeyStoreError('corrupt_envelope', 'Envelope failed schema validation')
  }
  return parsed
}

export function serializeEnvelope(env: KeyEnvelope): string {
  return JSON.stringify(env)
}
