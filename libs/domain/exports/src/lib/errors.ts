import type { ExportFormat, ExportKind, ValidationIssue } from './types'

/**
 * Domain-owned error types (GRASP: Information Expert). The only place errors
 * about export shape, redaction, or format support are defined.
 */
export class ExportError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ExportError'
    this.code = code
  }
}

export class ExportUnsupportedError extends ExportError {
  readonly kind: ExportKind
  readonly format: ExportFormat
  constructor(kind: ExportKind, format: ExportFormat) {
    super('EXPORT_UNSUPPORTED', `No serializer registered for kind=${kind} format=${format}`)
    this.name = 'ExportUnsupportedError'
    this.kind = kind
    this.format = format
  }
}

export class ExportValidationError extends ExportError {
  readonly issues: ValidationIssue[]
  constructor(issues: ValidationIssue[]) {
    super('EXPORT_VALIDATION', `Validation failed with ${issues.length} issue(s)`)
    this.name = 'ExportValidationError'
    this.issues = issues
  }
}

export class ExportRedactionError extends ExportError {
  constructor(reason: string) {
    super('EXPORT_REDACTION', reason)
    this.name = 'ExportRedactionError'
  }
}

export class ExportPathTraversalError extends ExportError {
  readonly attemptedPath: string
  constructor(attemptedPath: string) {
    super('EXPORT_PATH_TRAVERSAL', `Refused to write outside workspace root: ${attemptedPath}`)
    this.name = 'ExportPathTraversalError'
    this.attemptedPath = attemptedPath
  }
}
