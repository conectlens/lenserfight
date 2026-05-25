import { validateParamValue as domainValidateParamValue } from '@lenserfight/domain/lens-parameters'
import { LensVersionParam } from '@lenserfight/types'

export { sanitizeStringInput } from '@lenserfight/domain/lens-parameters'

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

/** @deprecated Import from `@lenserfight/domain/lens-parameters` instead. */
export function validateParamValue(
  value: unknown,
  param: LensVersionParam,
  modelInputModalities?: string[],
): string | null {
  return domainValidateParamValue(value, param, modelInputModalities)
}
