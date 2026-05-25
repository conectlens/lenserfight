import type { LensVersionParam } from '@lenserfight/types'

/**
 * Validates a single parameter value against its tool schema.
 * Returns an error message string, or null if valid.
 */
export function validateParamValue(
  value: unknown,
  param: LensVersionParam,
  modelInputModalities?: string[],
): string | null {
  const tool = param.tool
  const type = tool.type
  const min = tool.validationSchema?.min ?? null
  const max = tool.validationSchema?.max ?? null
  const name = param.label

  const isRequired = tool.required && !param.optional
  if (isRequired && (value === null || value === undefined || value === '')) {
    return `${name} is required`
  }

  if (value === null || value === undefined || value === '') return null

  if (Array.isArray(value) && value.length === 0 && isRequired) {
    return `${name} is required`
  }

  const strValue = String(value)

  if (type === 'integer') {
    const n = parseInt(strValue, 10)
    if (isNaN(n) || !Number.isInteger(n)) return `${name} must be an integer`
    if (min !== null && n < min) return `${name} must be ≥ ${min}`
    if (max !== null && n > max) return `${name} must be ≤ ${max}`
  }

  if (type === 'float' || type === 'decimal' || type === 'number') {
    const n = parseFloat(strValue)
    if (isNaN(n)) return `${name} must be a number`
    if (min !== null && n < min) return `${name} must be ≥ ${min}`
    if (max !== null && n > max) return `${name} must be ≤ ${max}`
  }

  if (type === 'url') {
    const schemes = tool.validationSchema?.urlScheme ?? ['http', 'https']
    try {
      const parsed = new URL(strValue)
      const protocol = parsed.protocol.replace(':', '')
      if (!schemes.includes(protocol)) {
        return `${name} must start with ${schemes.join(' or ')}`
      }
    } catch {
      return `${name} must be a valid URL`
    }
  }

  if (type === 'date' || type === 'datetime') {
    if (isNaN(Date.parse(strValue))) {
      return `${name} must be a valid ${type === 'datetime' ? 'date-time' : 'date'}`
    }
  }

  if (type === 'select' && tool.options?.length) {
    const allowed = tool.options.map((o) => o.value)
    if (!allowed.includes(strValue)) {
      return `${name} must be one of: ${allowed.join(', ')}`
    }
  }

  if (type === 'multiselect' && tool.options?.length) {
    const allowed = new Set(tool.options.map((o) => o.value))
    const selected = Array.isArray(value) ? value.map(String) : [strValue]
    const invalid = selected.filter((v) => !allowed.has(v))
    if (invalid.length > 0) {
      return `${name} contains invalid options: ${invalid.join(', ')}`
    }
  }

  if (type === 'file' && modelInputModalities) {
    // MIME check happens at upload time
    void modelInputModalities
  }

  return null
}

/**
 * Validates all version parameters; returns a map of label → error message.
 */
export function validateAllParamValues(
  values: Record<string, unknown>,
  params: LensVersionParam[],
  modelInputModalities?: string[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const p of params) {
    const err = validateParamValue(values[p.label], p, modelInputModalities)
    if (err) errors[p.label] = err
  }
  return errors
}
