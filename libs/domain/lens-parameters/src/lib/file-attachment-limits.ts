import type { LensVersionParam } from '@lenserfight/types'

/** Max attachments per `files` parameter (global cap). */
export const MAX_FILES_PER_FILES_PARAM = 10

/** Max `files` attachments across all `files` params in one lab run. */
export const MAX_FILES_PER_RUN = 20

/** Per-file size cap (aligns with lens-resources bucket 50 MiB). */
export const MAX_FILE_BYTES = 52_428_800

/** Max total bytes for one `files` parameter. */
export const MAX_TOTAL_BYTES_PER_FILES_PARAM = 104_857_600

/** Max total bytes for all `files` params in one run. */
export const MAX_TOTAL_BYTES_PER_RUN = 209_715_200

/** Max multimodal content parts (text + attachments) in one provider message. */
export const MAX_CONTENT_PARTS_PER_MESSAGE = 20

/** Default allowed MIME prefixes when tool schema omits allowedMimeTypes. */
export const DEFAULT_ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'audio/',
  'video/',
] as const

export type FileValidationSchema = {
  min?: number | null
  max?: number | null
  maxCount?: number | null
  maxFileBytes?: number | null
  maxTotalBytes?: number | null
  urlScheme?: string[] | null
  allowedMimeTypes?: string[] | null
}

export function effectiveMaxCount(param: LensVersionParam): number {
  const schema = param.tool.validationSchema as FileValidationSchema | null
  const n = schema?.maxCount
  if (typeof n === 'number' && n > 0) return Math.min(n, MAX_FILES_PER_FILES_PARAM)
  return MAX_FILES_PER_FILES_PARAM
}

export function effectiveMaxFileBytes(param: LensVersionParam): number {
  const schema = param.tool.validationSchema as FileValidationSchema | null
  const n = schema?.maxFileBytes
  if (typeof n === 'number' && n > 0) return Math.min(n, MAX_FILE_BYTES)
  return MAX_FILE_BYTES
}

export function effectiveMaxTotalBytes(param: LensVersionParam): number {
  const schema = param.tool.validationSchema as FileValidationSchema | null
  const n = schema?.maxTotalBytes
  if (typeof n === 'number' && n > 0) return Math.min(n, MAX_TOTAL_BYTES_PER_FILES_PARAM)
  return MAX_TOTAL_BYTES_PER_FILES_PARAM
}

export function isMimeAllowed(mimeType: string, param: LensVersionParam): boolean {
  const allowed = param.tool.validationSchema?.allowedMimeTypes
  if (allowed?.length) {
    return allowed.some(
      (a) => mimeType === a || (a.endsWith('/') && mimeType.startsWith(a)),
    )
  }
  return DEFAULT_ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))
}

/** Normalize snapshot/UI value to ordered UUID list (deduped). */
export function normalizeFilesParamIds(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return []
  const raw = Array.isArray(value) ? value : [value]
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const s = String(item).trim()
    if (!uuidRe.test(s) || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

export function countFilesInSnapshot(
  values: Record<string, unknown>,
  params: LensVersionParam[],
): number {
  let total = 0
  for (const p of params) {
    if (p.tool.type !== 'files') continue
    total += normalizeFilesParamIds(values[p.label]).length
  }
  return total
}

export function isPublicHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}
