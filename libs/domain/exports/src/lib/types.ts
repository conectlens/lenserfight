/**
 * Universal Export System — core domain types.
 *
 * GRASP: Information Expert. These types own the export shape; no other layer
 * may invent its own envelope or manifest format. Bumping the schema version is
 * the only way to remove or rename a field (Protected Variations).
 */

export type ExportKind = 'battle' | 'workflow' | 'lens' | 'agent' | 'bundle'

export type ExportFormat = 'markdown' | 'json' | 'yaml'

export type ExportVisibility = 'public' | 'authenticated' | 'owner'

export type ExportVia = 'web' | 'cli' | 'api'

export const EXPORT_SCHEMA_VERSION = '1.0.0' as const

export const EXPORT_KINDS: readonly ExportKind[] = [
  'battle',
  'workflow',
  'lens',
  'agent',
  'bundle',
] as const

export const EXPORT_FORMATS: readonly ExportFormat[] = ['markdown', 'json', 'yaml'] as const

export const EXPORT_VISIBILITIES: readonly ExportVisibility[] = [
  'public',
  'authenticated',
  'owner',
] as const

export interface ExportSource {
  host: string
  tenantId: string | null
  commit?: string
}

export interface ExportGeneratedBy {
  userId: string | null
  via: ExportVia
}

export interface ExportEnvelope<T = unknown> {
  schema: `lenserfight.export.v${number}`
  schemaVersion: string
  kind: ExportKind
  generatedAt: string
  generatedBy: ExportGeneratedBy
  source: ExportSource
  visibility: ExportVisibility
  redactions: string[]
  data: T
  checksum: string
}

export interface ExportManifestEntry {
  kind: ExportKind
  slug: string
  format: ExportFormat
  path: string
  bytes: number
  sha256: string
}

export interface ExportManifest {
  manifestVersion: '1'
  exportId: string
  createdAt: string
  entries: ExportManifestEntry[]
  signature?: string
}

export interface ExportRequest {
  kind: ExportKind
  slug: string
  format: ExportFormat
  visibility?: ExportVisibility
  oneShot?: boolean
  nonce?: string
}

export interface ExportContext {
  userId: string | null
  tenantId: string | null
  via: ExportVia
  host: string
  commit?: string
  /** True when caller owns the entity being exported. */
  isOwner: boolean
  /** True when caller is authenticated (even if not owner). */
  isAuthenticated: boolean
}

export interface ValidationIssue {
  path: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  issues: ValidationIssue[]
}
