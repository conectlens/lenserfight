import { LensVersionParam } from '@lenserfight/types'

// MIME type → modality mapping aligned with ai.models.input_modalities values
const MIME_TO_MODALITY: [RegExp, string][] = [
  [/^image\//, 'image'],
  [/^video\//, 'video'],
  [/^audio\//, 'audio'],
  [/^application\/pdf$/, 'document'],
  [/^application\/msword$/, 'document'],
  [/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml/, 'document'],
  [/^application\/vnd\.ms-excel$/, 'document'],
  [/^application\/vnd\.openxmlformats-officedocument\.spreadsheetml/, 'document'],
  [/^text\//, 'text'],
]

/**
 * Maps a MIME type to an ai.models input modality string.
 * Returns null if no modality can be inferred.
 */
export function mimeToModality(mimeType: string): string | null {
  for (const [pattern, modality] of MIME_TO_MODALITY) {
    if (pattern.test(mimeType)) return modality
  }
  return null
}

/**
 * Returns true if the model accepts files of the given MIME type,
 * based on its declared input_modalities.
 */
export function canModelAcceptFile(mimeType: string, inputModalities: string[]): boolean {
  const modality = mimeToModality(mimeType)
  if (!modality) return false
  return inputModalities.includes(modality)
}

/**
 * Strips null bytes, double-brace template injection patterns {{ }},
 * and trims the string to at most 10 000 characters.
 */
export function sanitizeStringInput(value: string): string {
  return value
    .replace(/\0/g, '')                  // null bytes
    .replace(/\{\{.*?\}\}/gs, '')        // template injection {{...}}
    .slice(0, 10_000)
}

/**
 * Validates a single parameter value against its schema.
 * Returns an error message string, or null if valid.
 */
export function validateParamValue(
  value: unknown,
  param: LensVersionParam,
  modelInputModalities?: string[],
): string | null {
  const type = param.type
  const min = param.min ?? param.validationSchema?.min ?? null
  const max = param.max ?? param.validationSchema?.max ?? null

  if (param.required && (value === null || value === undefined || value === '')) {
    return `${param.label ?? param.key} is required`
  }

  if (value === null || value === undefined || value === '') return null

  const strValue = String(value)

  if (type === 'integer') {
    const n = parseInt(strValue, 10)
    if (isNaN(n) || !Number.isInteger(n)) return `${param.label ?? param.key} must be an integer`
    if (min !== null && n < min) return `${param.label ?? param.key} must be ≥ ${min}`
    if (max !== null && n > max) return `${param.label ?? param.key} must be ≤ ${max}`
  }

  if (type === 'float' || type === 'decimal' || type === 'number') {
    const n = parseFloat(strValue)
    if (isNaN(n)) return `${param.label ?? param.key} must be a number`
    if (min !== null && n < min) return `${param.label ?? param.key} must be ≥ ${min}`
    if (max !== null && n > max) return `${param.label ?? param.key} must be ≤ ${max}`
  }

  if (type === 'url') {
    const schemes = param.validationSchema?.urlScheme ?? ['http', 'https']
    try {
      const parsed = new URL(strValue)
      const protocol = parsed.protocol.replace(':', '')
      if (!schemes.includes(protocol)) {
        return `${param.label ?? param.key} must start with ${schemes.join(' or ')}`
      }
    } catch {
      return `${param.label ?? param.key} must be a valid URL`
    }
  }

  if (type === 'date') {
    if (isNaN(Date.parse(strValue))) return `${param.label ?? param.key} must be a valid date`
  }

  if (type === 'datetime') {
    if (isNaN(Date.parse(strValue))) return `${param.label ?? param.key} must be a valid date-time`
  }

  if (type === 'file' && modelInputModalities) {
    // value is expected to be a media_object_id uuid — MIME check is done before upload
    // Nothing to validate at runtime beyond the upload gate
  }

  return null
}
