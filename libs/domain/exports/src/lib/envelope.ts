import { canonicalize } from './canonical'
import { sha256OfString } from './checksum'
import { ExportError, ExportValidationError } from './errors'
import { applyRedactionPolicy } from './redaction'
import {
  EXPORT_KINDS,
  EXPORT_SCHEMA_VERSION,
  EXPORT_VISIBILITIES,
  type ExportContext,
  type ExportEnvelope,
  type ExportKind,
  type ValidationIssue,
} from './types'

/**
 * ExportEnvelopeFactory — Creator pattern (GRASP).
 *
 * Only place envelopes are minted. Guarantees:
 * - schemaVersion is always EXPORT_SCHEMA_VERSION
 * - schema literal pins the major version
 * - checksum is sha256 of canonical(data) — never includes timestamps,
 *   so identical entities always produce identical hashes (dedupe-friendly)
 * - redactions is non-empty whenever the requester lacks owner scope
 *   (enforced by validateEnvelope)
 */
export class ExportEnvelopeFactory {
  async build<T>(input: {
    kind: ExportKind
    data: T
    ctx: ExportContext
  }): Promise<ExportEnvelope<T>> {
    const { kind, data, ctx } = input
    if (!EXPORT_KINDS.includes(kind)) {
      throw new ExportError('EXPORT_KIND_INVALID', `Unknown export kind: ${kind}`)
    }
    const { data: redactedData, redactions, visibility } = applyRedactionPolicy(data, ctx)
    const checksum = await sha256OfString(canonicalize(redactedData))
    const envelope: ExportEnvelope<T> = {
      schema: 'lenserfight.export.v1',
      schemaVersion: EXPORT_SCHEMA_VERSION,
      kind,
      generatedAt: new Date().toISOString(),
      generatedBy: { userId: ctx.userId, via: ctx.via },
      source: { host: ctx.host, tenantId: ctx.tenantId, commit: ctx.commit },
      visibility,
      redactions,
      data: redactedData,
      checksum,
    }
    const issues = validateEnvelope(envelope)
    if (issues.length > 0) throw new ExportValidationError(issues)
    return envelope
  }
}

/**
 * Pure invariant check. Returns a list of issues rather than throwing so
 * callers can surface multiple problems at once.
 */
export function validateEnvelope(env: ExportEnvelope<unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (env.schema !== 'lenserfight.export.v1') {
    issues.push({ path: 'schema', message: 'schema literal must be "lenserfight.export.v1"' })
  }
  if (env.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    issues.push({
      path: 'schemaVersion',
      message: `schemaVersion must be ${EXPORT_SCHEMA_VERSION}`,
    })
  }
  if (!EXPORT_KINDS.includes(env.kind)) {
    issues.push({ path: 'kind', message: `unknown kind: ${env.kind}` })
  }
  if (!EXPORT_VISIBILITIES.includes(env.visibility)) {
    issues.push({ path: 'visibility', message: `unknown visibility: ${env.visibility}` })
  }
  if (!/^[0-9a-f]{64}$/.test(env.checksum)) {
    issues.push({ path: 'checksum', message: 'checksum must be 64-char lowercase hex' })
  }
  if (env.visibility !== 'owner' && env.redactions.length === 0) {
    issues.push({
      path: 'redactions',
      message:
        'redactions must be non-empty when visibility !== "owner" (caller lacks owner scope)',
    })
  }
  if (!Number.isFinite(Date.parse(env.generatedAt))) {
    issues.push({ path: 'generatedAt', message: 'generatedAt must be an ISO-8601 timestamp' })
  }
  return issues
}
