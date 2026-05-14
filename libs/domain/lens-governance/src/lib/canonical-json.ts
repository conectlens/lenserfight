/**
 * Canonical JSON serialization for content-addressed Lens Contracts.
 *
 * Rules:
 *  - Object keys sorted lexicographically at every depth.
 *  - No insignificant whitespace.
 *  - `undefined` values are omitted (matches JSON.stringify).
 *  - `null` is preserved.
 *  - Numbers serialized via JSON.stringify (callers should avoid `NaN`/Infinity).
 *  - Arrays preserve order (semantically meaningful for Lens parameters).
 *
 * The resulting string is the input to sha256; given the same logical body,
 * any runtime in any language must produce the same hash.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`,
  )
  return `{${entries.join(',')}}`
}
