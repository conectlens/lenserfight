/**
 * Canonical label for [[tokens]], version_parameters.label, and input_snapshot keys.
 * Preserves internal spaces and hyphens; lowercases for case-insensitive matching.
 */
export function normalizeParamLabel(raw: string): string {
  const trimmed = raw.trim()
  const optional = trimmed.endsWith('!')
  const core = optional ? trimmed.slice(0, -1).trimEnd() : trimmed
  return core.toLowerCase()
}

/** Bracket token as stored in human-readable template bodies. */
export function paramTokenBracket(label: string, optional = false): string {
  return `[[${label}${optional ? '!' : ''}]]`
}
