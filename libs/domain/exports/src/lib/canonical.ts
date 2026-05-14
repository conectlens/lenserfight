/**
 * Canonical JSON serialization (RFC 8785-style, simplified subset).
 *
 * GRASP: Pure Fabrication. Lives in the domain layer because the checksum
 * invariant on ExportEnvelope depends on it; no UI or transport may
 * reinterpret the canonical form. Pure function, no IO, isomorphic
 * (browser, Node, Deno edge).
 *
 * Guarantees:
 * - keys sorted lexicographically (UTF-16 code unit order)
 * - integers preserved as digits, floats as shortest round-trip form
 * - NaN / +/-Infinity rejected (would not round-trip)
 * - undefined keys dropped (JSON has no undefined)
 * - no trailing whitespace, no insignificant whitespace
 */

export function canonicalize(value: unknown): string {
  return serialize(value)
}

function serialize(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) {
    throw new TypeError('canonicalize: undefined is not representable in JSON')
  }
  const t = typeof value
  if (t === 'boolean') return value ? 'true' : 'false'
  if (t === 'number') return serializeNumber(value as number)
  if (t === 'bigint') {
    throw new TypeError('canonicalize: bigint is not representable in canonical JSON')
  }
  if (t === 'string') return serializeString(value as string)
  if (Array.isArray(value)) return serializeArray(value)
  if (t === 'object') return serializeObject(value as Record<string, unknown>)
  throw new TypeError(`canonicalize: unsupported type ${t}`)
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new TypeError('canonicalize: NaN/Infinity are not representable in canonical JSON')
  }
  if (Object.is(n, -0)) return '0'
  return JSON.stringify(n)
}

function serializeString(s: string): string {
  return JSON.stringify(s.normalize('NFC'))
}

function serializeArray(arr: unknown[]): string {
  const items: string[] = []
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    items.push(item === undefined ? 'null' : serialize(item))
  }
  return `[${items.join(',')}]`
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
  const parts = keys.map((k) => `${serializeString(k)}:${serialize(obj[k])}`)
  return `{${parts.join(',')}}`
}
