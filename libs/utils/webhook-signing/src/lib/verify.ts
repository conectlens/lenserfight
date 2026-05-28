import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a LenserFight webhook signature header against an HMAC-SHA256 of the
 * raw request body. Header format is `sha256=<lowercase-hex>` (matching the
 * widely-used GitHub / Stripe convention).
 *
 * Returns false on any malformed input; never throws. Constant-time comparison
 * via timingSafeEqual avoids leaking signature bytes via response timing.
 *
 * @param secret The shared signing secret (UTF-8). Empty string returns false.
 * @param body   The raw request body (string). Re-stringifying parsed JSON is
 *               unsafe — callers must hash the bytes that were actually
 *               transmitted.
 * @param header The value of the `X-Lenserfight-Signature` (or equivalent)
 *               header, e.g. `sha256=ab12...`.
 */
export function verifyLenserfightSignature(
  secret: string,
  body: string,
  header: string
): boolean {
  if (!secret || !body || !header) return false

  const trimmed = header.trim()
  const prefix = 'sha256='
  if (!trimmed.toLowerCase().startsWith(prefix)) return false

  const providedHex = trimmed.slice(prefix.length).toLowerCase()
  // SHA-256 hex digest is exactly 64 chars (32 bytes).
  if (providedHex.length !== 64 || !/^[0-9a-f]+$/.test(providedHex)) return false

  const expectedHex = createHmac('sha256', secret).update(body, 'utf-8').digest('hex')

  const a = Buffer.from(expectedHex, 'hex')
  const b = Buffer.from(providedHex, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
