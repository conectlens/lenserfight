import type { LensVersionParam, LensVersionParamType } from '@lenserfight/types'

import { sanitizeStringInput } from './sanitize-string-input'

const STRING_LIKE_TYPES: LensVersionParamType[] = ['text', 'textarea', 'url', 'json', 'date', 'datetime']

/**
 * Coerces a raw UI value to the shape stored in input_snapshot and used for prompt substitution.
 */
export function coerceParamValue(value: unknown, param: LensVersionParam): unknown {
  const type = param.tool.type

  if (value === null || value === undefined || value === '') {
    return type === 'boolean' ? false : type === 'multiselect' ? [] : ''
  }

  switch (type) {
    case 'boolean':
      return Boolean(value)
    case 'integer': {
      const n = parseInt(String(value), 10)
      return isNaN(n) ? 0 : n
    }
    case 'number':
    case 'float':
    case 'decimal': {
      const n = parseFloat(String(value))
      return isNaN(n) ? 0 : n
    }
    case 'multiselect':
      return Array.isArray(value) ? value.map(String) : [String(value)]
    case 'array': {
      if (Array.isArray(value)) return value.map(String).join(', ')
      return typeof value === 'string' ? sanitizeStringInput(value) : String(value)
    }
    case 'select':
      return String(value)
    case 'file':
      return String(value)
    default:
      if (STRING_LIKE_TYPES.includes(type)) {
        return typeof value === 'string' ? sanitizeStringInput(value) : String(value)
      }
      return typeof value === 'string' ? sanitizeStringInput(value) : value
  }
}

/**
 * Formats a coerced value as a string for prompt template substitution.
 */
export function formatParamForPrompt(value: unknown, param: LensVersionParam): string {
  const type = param.tool.type
  if (value === null || value === undefined) return ''

  switch (type) {
    case 'boolean':
      return value ? 'true' : 'false'
    case 'integer':
    case 'number':
    case 'float':
    case 'decimal':
      return String(value)
    case 'multiselect': {
      const arr = Array.isArray(value) ? value : [value]
      return arr.map(String).join(', ')
    }
    case 'array':
      return Array.isArray(value) ? value.map(String).join(', ') : String(value)
    default:
      return String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

/**
 * Builds input_snapshot keyed by parameter label with coerced values.
 */
export function buildInputSnapshot(
  values: Record<string, unknown>,
  params: LensVersionParam[],
): Record<string, unknown> {
  return Object.fromEntries(
    params.map((p) => [p.label, coerceParamValue(values[p.label], p)]),
  )
}
