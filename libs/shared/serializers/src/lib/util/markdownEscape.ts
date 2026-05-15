/**
 * Defensive escapes for markdown export. The export feature has no idea
 * what content the user puts into a battle title; treat every string as
 * untrusted before it ends up in YAML frontmatter or a Markdown table.
 */

// eslint-disable-next-line no-control-regex
const ALL_CONTROL_CHARS = /[\x00-\x1f\x7f]/g
// eslint-disable-next-line no-control-regex
const NON_PRINTABLE_CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g

/**
 * Coerce any runtime value to a string safely. Supabase payloads can
 * surface null, undefined, or objects where the domain type says string.
 */
function toSafeString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return String(v)
}

/** Escape a single-line string for a YAML scalar in frontmatter. Always quotes. */
export function escapeYamlString(value: string): string {
  // Strip control chars rather than producing invalid YAML.
  const stripped = toSafeString(value).replace(ALL_CONTROL_CHARS, '')
  return `"${stripped.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Strip non-printable control characters from markdown body input. Keeps \t \n \r. */
export function escapeMarkdown(value: string): string {
  return toSafeString(value).replace(NON_PRINTABLE_CONTROL_CHARS, '')
}

/** Strip any HTML/script-shaped sequences from a string that lands in markdown. */
export function stripHtml(value: string): string {
  return toSafeString(value).replace(/<\/?[a-zA-Z][^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '')
}

/** Render a primitive value as a YAML frontmatter scalar. */
export function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'null'
    return String(value)
  }
  if (typeof value === 'string') return escapeYamlString(value)
  // JSON.stringify returns undefined for functions/symbols — fall back to 'null'.
  const json = JSON.stringify(value)
  return json !== undefined ? escapeYamlString(json) : 'null'
}
