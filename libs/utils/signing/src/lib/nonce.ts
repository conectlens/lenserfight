import { randomBytes } from 'node:crypto'

/**
 * Generate a 128-bit cryptographically random nonce, base64url-encoded.
 * Matches the SignedEnvelope contract in RFC-0003 §3.
 */
export function generateNonce(byteLength = 16): string {
  if (!Number.isInteger(byteLength) || byteLength < 8 || byteLength > 64) {
    throw new RangeError('generateNonce: byteLength must be an integer in [8, 64]')
  }
  return randomBytes(byteLength).toString('base64url')
}

/**
 * Compute the canonical Unix-seconds `iat` for an envelope. Centralized so
 * tests and signing code agree on the source of truth.
 */
export function nowIat(): number {
  return Math.floor(Date.now() / 1000)
}
