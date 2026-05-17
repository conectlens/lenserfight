/**
 * Spec content hash utilities.
 *
 * Computes a stable SHA-256 digest over the canonical form of a spec's
 * frontmatter object. The digest is used for:
 *
 *   1. Immutable version references in execution provenance.
 *   2. Tamper detection in signed execution snapshots.
 *   3. Cache keys for spec-derived artifacts.
 *
 * Canonical form rules:
 *   - Object keys sorted lexicographically (recursive).
 *   - Undefined and null values omitted.
 *   - Arrays preserved in order.
 *   - JSON serialized with no extra whitespace.
 *
 * These rules are identical to the ones in libs/domain/exports/src/lib/canonical.ts
 * so that spec digests and export checksums are interoperable.
 *
 * GRASP: Pure Fabrication — no natural domain home, lives here as a shared
 * utility rather than polluting the domain model.
 */

// ─── Canonical JSON ───────────────────────────────────────────────────────────

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']'
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined && obj[k] !== null)
      .sort()
    return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',') + '}'
  }

  return JSON.stringify(value)
}

// ─── SHA-256 (sync, Node.js native crypto) ────────────────────────────────────

function sha256Sync(text: string): string {
  // Use Node.js synchronous crypto (available in CLI context, Node 22+).
  // We import lazily so this file can be tree-shaken in browser builds
  // that don't need sync hashing.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createHash } = require('node:crypto') as typeof import('node:crypto')
    return createHash('sha256').update(text, 'utf8').digest('hex')
  } catch {
    return sha256PureJs(text)
  }
}

// Pure-JS fallback (same algorithm as libs/domain/exports/src/lib/checksum.ts)
function sha256PureJs(text: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ]
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
    0x5be0cd19,
  ]

  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i++
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        )
      }
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0xf))
    }
  }

  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while ((bytes.length % 64) !== 56) bytes.push(0)
  for (let i = 3; i >= 0; i--) bytes.push(0)
  for (let i = 3; i >= 0; i--) bytes.push((bitLen >>> (i * 8)) & 0xff)

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Uint32Array(64)
    for (let j = 0; j < 16; j++) {
      w[j] = (bytes[i + j * 4] << 24) | (bytes[i + j * 4 + 1] << 16) | (bytes[i + j * 4 + 2] << 8) | bytes[i + j * 4 + 3]
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10)
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = H
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute a stable SHA-256 digest of the canonical form of a spec frontmatter
 * object. The result is a 64-character lowercase hex string.
 *
 * This function is synchronous so it can be used in CLI validation without
 * async overhead. The Node.js native crypto path is ~10× faster than the
 * pure-JS fallback.
 *
 * @param frontmatter - The raw parsed frontmatter object (before any normalization).
 */
export function computeSpecDigest(frontmatter: Record<string, unknown>): string {
  const canonical = canonicalize(frontmatter)
  return sha256Sync(canonical)
}

/**
 * Compute the execution seal hash:
 *   sha256(specContentHash + "|" + inputHash + "|" + outputHash)
 *
 * This is a deterministic fingerprint of a single execution that changes
 * whenever the spec, input, or output changes.
 */
export function computeExecutionSeal(
  specContentHash: string,
  inputHash: string,
  outputHash: string,
): string {
  return sha256Sync(`${specContentHash}|${inputHash}|${outputHash}`)
}
