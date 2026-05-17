/**
 * generateUUID — RFC 4122 v4 UUID, safe on HTTP (non-secure) origins.
 *
 * `crypto.randomUUID()` requires a Secure Context (HTTPS or localhost).
 * Developers accessing the app via a LAN IP (http://192.168.x.x), a
 * Tailscale node, or any plain-HTTP URL get `TypeError: crypto.randomUUID
 * is not a function`.
 *
 * This helper uses `crypto.randomUUID()` when available and falls back to
 * `crypto.getRandomValues()`, which IS available on non-secure origins in
 * all modern browsers (Chrome 37+, Firefox 36+, Safari 7+).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Secure-context check failed at call time; fall through.
    }
  }

  // RFC 4122 §4.4 — version 4, variant 1 UUID built from random bytes.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // version 4 → top nibble of byte[6] = 0b0100
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  // variant 1 → top two bits of byte[8] = 0b10
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`
}
