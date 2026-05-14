/**
 * Wire-level error codes for the export API. Shared by the web client,
 * CLI, and edge functions. New codes are additive; codes are never
 * renumbered (Protected Variations).
 */
export const EXPORT_ERROR_CODES = {
  UNSUPPORTED: 'EXPORT_UNSUPPORTED',
  VALIDATION: 'EXPORT_VALIDATION',
  REDACTION: 'EXPORT_REDACTION',
  PATH_TRAVERSAL: 'EXPORT_PATH_TRAVERSAL',
  RATE_LIMITED: 'EXPORT_RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'EXPORT_PAYLOAD_TOO_LARGE',
  TENANT_MISMATCH: 'EXPORT_TENANT_MISMATCH',
  NOT_FOUND: 'EXPORT_NOT_FOUND',
  ONESHOT_CONSUMED: 'EXPORT_ONESHOT_CONSUMED',
  SIGNATURE_INVALID: 'EXPORT_SIGNATURE_INVALID',
} as const

export type ExportErrorCode = (typeof EXPORT_ERROR_CODES)[keyof typeof EXPORT_ERROR_CODES]
