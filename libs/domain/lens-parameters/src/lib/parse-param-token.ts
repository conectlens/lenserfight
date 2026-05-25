import type { LensVersionParamType } from '@lenserfight/types'

import { normalizeParamLabel } from './label-normalizer'

/** Valid inline type hints in `[[label:type]]` / `[[label:type!]]` tokens. */
export const KNOWN_PARAM_TYPES = new Set<LensVersionParamType>([
  'text',
  'textarea',
  'json',
  'number',
  'integer',
  'float',
  'decimal',
  'boolean',
  'select',
  'multiselect',
  'array',
  'url',
  'date',
  'datetime',
  'file',
  'files',
  'connector',
])

export interface ParsedParamTokenInner {
  label: string
  optional: boolean
  typeHint?: LensVersionParamType
}

const UUID_REF_INNER = /^:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Matches `[[...]]` named tokens (not used for `[[:uuid]]` refs). */
export const NAMED_BRACKET_REGEX = /\[\[([^\]]+)\]\]/g

/**
 * Parses the inner text of a `[[...]]` token (without brackets).
 * Returns null for invalid or UUID-ref inner content.
 */
export function parseParamTokenInner(raw: string): ParsedParamTokenInner | null {
  if (/^\s/.test(raw) || /\s$/.test(raw)) return null
  const trimmed = raw.trim()
  if (!trimmed || !/^\w/.test(trimmed)) return null
  if (UUID_REF_INNER.test(trimmed)) return null

  let optional = false
  let core = trimmed
  if (core.endsWith('!')) {
    optional = true
    core = core.slice(0, -1).trimEnd()
  }

  const colon = core.lastIndexOf(':')
  if (colon > 0) {
    const typePart = core.slice(colon + 1).trim().toLowerCase()
    if (KNOWN_PARAM_TYPES.has(typePart as LensVersionParamType)) {
      const label = normalizeParamLabel(core.slice(0, colon))
      if (!label) return null
      return { label, optional, typeHint: typePart as LensVersionParamType }
    }
  }

  const label = normalizeParamLabel(core)
  if (!label) return null
  return { label, optional }
}

function isUuidRefInner(inner: string): boolean {
  return UUID_REF_INNER.test(inner.trim())
}

/**
 * Extracts unique named parameter tokens from template content.
 */
export function extractNamedParamTokens(template: string): ParsedParamTokenInner[] {
  const seen = new Set<string>()
  const params: ParsedParamTokenInner[] = []
  const re = new RegExp(NAMED_BRACKET_REGEX.source, NAMED_BRACKET_REGEX.flags)

  let match: RegExpExecArray | null
  while ((match = re.exec(template)) !== null) {
    const inner = match[1]
    if (isUuidRefInner(inner)) continue
    const parsed = parseParamTokenInner(inner)
    if (!parsed || seen.has(parsed.label)) continue
    seen.add(parsed.label)
    params.push(parsed)
  }

  return params
}

/**
 * Replaces named `[[...]]` tokens via callback; leaves `[[:uuid]]` refs untouched.
 */
export function replaceNamedParamTokens(
  template: string,
  replacer: (match: string, parsed: ParsedParamTokenInner) => string,
): string {
  return template.replace(NAMED_BRACKET_REGEX, (match, inner: string) => {
    if (isUuidRefInner(inner)) return match
    const parsed = parseParamTokenInner(inner)
    if (!parsed) return match
    return replacer(match, parsed)
  })
}
