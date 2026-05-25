import {
  countFilesInSnapshot,
  effectiveMaxCount,
  effectiveMaxFileBytes,
  isMimeAllowed,
  MAX_FILES_PER_RUN,
  normalizeFilesParamIds,
} from '@lenserfight/domain/lens-parameters'
import type { LensVersionParam } from '@lenserfight/types'

export function validateLensFileBeforeUpload(
  file: File,
  param: LensVersionParam,
  currentIds: string[],
  allValues: Record<string, unknown>,
  allParams: LensVersionParam[],
): string | null {
  const maxCount = effectiveMaxCount(param)
  if (currentIds.length >= maxCount) {
    return `${param.label} allows at most ${maxCount} file(s)`
  }

  const runCount = countFilesInSnapshot(allValues, allParams) + 1
  if (runCount > MAX_FILES_PER_RUN) {
    return `This run allows at most ${MAX_FILES_PER_RUN} files across all attachment parameters`
  }

  const maxBytes = effectiveMaxFileBytes(param)
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return `File exceeds ${mb} MB limit for ${param.label}`
  }

  const mime = file.type || 'application/octet-stream'
  if (!isMimeAllowed(mime, param)) {
    return `File type "${mime}" is not allowed for ${param.label}`
  }

  return null
}

export function appendFileParamId(current: unknown, newId: string): string[] {
  return [...normalizeFilesParamIds(current), newId]
}

export function removeFileParamId(current: unknown, objectId: string): string[] {
  return normalizeFilesParamIds(current).filter((id) => id !== objectId)
}
