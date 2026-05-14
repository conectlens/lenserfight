/**
 * Wire DTOs for the export API. Plain TS interfaces + hand-written
 * type guards (zod is not a workspace dep; adding it for one feature
 * would bloat every bundle that depends on this lib).
 *
 * GRASP: Protected Variations. The web client, CLI, and edge fn all
 * import these types; tests in libs/api/exports verify any breaking
 * change requires a schemaVersion bump.
 */

import {
  EXPORT_FORMATS,
  EXPORT_KINDS,
  type ExportFormat,
  type ExportKind,
  type ExportManifest,
} from '@lenserfight/domain/exports'

export type ExportJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'revoked'

export interface ExportRequestDTO {
  kind: ExportKind
  slug: string
  format: ExportFormat
  oneShot?: boolean
  nonce?: string
}

export interface ExportJobDTO {
  id: string
  state: ExportJobState
  kind: ExportKind
  contentSha256: string | null
  bucketKey: string | null
  bytes: number | null
  signedUrl: string | null
  signedUrlExpiresAt: string | null
  manifest: ExportManifest | null
  error: { code: string; message: string } | null
  createdAt: string
  finishedAt: string | null
}

export interface ExportListItemDTO {
  id: string
  kind: ExportKind
  state: ExportJobState
  createdAt: string
  bytes: number | null
}

export interface ExportListResponseDTO {
  items: ExportListItemDTO[]
  nextCursor: string | null
}

// ── Type guards ────────────────────────────────────────────────────────

export function isExportRequestDTO(value: unknown): value is ExportRequestDTO {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v['kind'] !== 'string' || !EXPORT_KINDS.includes(v['kind'] as ExportKind)) return false
  if (typeof v['slug'] !== 'string' || v['slug'].length === 0 || v['slug'].length > 200) return false
  if (typeof v['format'] !== 'string' || !EXPORT_FORMATS.includes(v['format'] as ExportFormat))
    return false
  if (v['oneShot'] !== undefined && typeof v['oneShot'] !== 'boolean') return false
  if (v['nonce'] !== undefined && (typeof v['nonce'] !== 'string' || v['nonce'].length > 128))
    return false
  return true
}

const JOB_STATES: readonly ExportJobState[] = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'revoked',
] as const

export function isExportJobDTO(value: unknown): value is ExportJobDTO {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v['id'] === 'string' &&
    typeof v['state'] === 'string' &&
    JOB_STATES.includes(v['state'] as ExportJobState) &&
    typeof v['kind'] === 'string' &&
    EXPORT_KINDS.includes(v['kind'] as ExportKind) &&
    typeof v['createdAt'] === 'string'
  )
}
