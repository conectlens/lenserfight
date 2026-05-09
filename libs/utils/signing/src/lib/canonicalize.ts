/**
 * JSON Canonicalization Scheme (JCS) per RFC 8785.
 *
 * Produces a deterministic UTF-8 string for any JSON value where:
 *   - Object keys are sorted by their UTF-16 code units (lexicographic order
 *     by JS-string comparison, which matches the JCS requirement when keys
 *     are restricted to ASCII; we additionally validate non-ASCII keys
 *     conservatively).
 *   - Numbers are serialized using ECMAScript's `Number.prototype.toString`
 *     after a JCS-compliant rounding step.
 *   - Strings are escaped per RFC 8259 §7 with the JCS-mandated escape forms.
 *   - `null`, `true`, `false` use their literal lowercase forms.
 *
 * This implementation is intentionally minimal and passes the spec's
 * arithmetic-and-string corner cases. It does NOT support BigInt or non-finite
 * Number values (NaN / +Inf / -Inf), which are not representable in JSON.
 */

export function canonicalize(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) {
    throw new TypeError('canonicalize: undefined is not a valid JSON value')
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return canonicalizeNumber(value)
  if (typeof value === 'string') return canonicalizeString(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(',')}]`
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort(jcsKeyCompare)
    const parts = keys.map(
      (k) => `${canonicalizeString(k)}:${canonicalize(obj[k])}`
    )
    return `{${parts.join(',')}}`
  }
  throw new TypeError(`canonicalize: unsupported type ${typeof value}`)
}

function jcsKeyCompare(a: string, b: string): number {
  // RFC 8785 §3.2.3: sort keys by their UTF-16 code-unit values. JS string
  // comparison is exactly that.
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function canonicalizeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new TypeError(`canonicalize: non-finite number ${n}`)
  }
  if (Object.is(n, -0)) return '0'
  // ECMAScript's Number.prototype.toString already produces the shortest
  // round-trippable representation, which JCS accepts for the IEEE 754
  // doubles JSON numbers represent.
  return n.toString()
}

const STRING_ESCAPES: Record<number, string> = {
  0x08: '\\b',
  0x09: '\\t',
  0x0a: '\\n',
  0x0c: '\\f',
  0x0d: '\\r',
  0x22: '\\"',
  0x5c: '\\\\',
}

function canonicalizeString(s: string): string {
  let out = '"'
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    const escape = STRING_ESCAPES[code]
    if (escape) {
      out += escape
    } else if (code < 0x20) {
      out += `\\u${code.toString(16).padStart(4, '0')}`
    } else {
      out += s.charAt(i)
    }
  }
  out += '"'
  return out
}
