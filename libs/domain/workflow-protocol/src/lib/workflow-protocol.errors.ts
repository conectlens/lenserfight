/**
 * Error taxonomy for the workflow protocol.
 *
 * The four stages are kept distinct so the UI can tell the user *where* an
 * import failed: a YAML typo is not the same problem as a dangling connection,
 * and neither is the same as the database rejecting a write.
 */

export type WorkflowProtocolIssueStage =
  /** The text could not be turned into a JS value at all (bad JSON/YAML syntax). */
  | 'parse'
  /** The value is not a well-formed protocol document (missing/ill-typed fields). */
  | 'structure'
  /** The document is well-formed but describes an impossible workflow. */
  | 'semantic'
  /** Validation passed but writing to the database failed. */
  | 'persistence'

export type WorkflowProtocolIssueSeverity = 'error' | 'warning'

export interface WorkflowProtocolIssue {
  stage: WorkflowProtocolIssueStage
  severity: WorkflowProtocolIssueSeverity
  /**
   * Dotted path into the document, e.g. `steps.2.parameters.Topic`.
   * Empty string for document-level issues.
   */
  path: string
  message: string
}

export interface WorkflowProtocolResult<T> {
  ok: boolean
  value: T | null
  issues: WorkflowProtocolIssue[]
}

export function protocolIssue(
  stage: WorkflowProtocolIssueStage,
  path: string,
  message: string,
  severity: WorkflowProtocolIssueSeverity = 'error',
): WorkflowProtocolIssue {
  return { stage, severity, path, message }
}

export function hasBlockingIssue(issues: readonly WorkflowProtocolIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}

export function protocolFailure<T>(
  issues: readonly WorkflowProtocolIssue[],
): WorkflowProtocolResult<T> {
  return { ok: false, value: null, issues: [...issues] }
}

export function protocolSuccess<T>(
  value: T,
  issues: readonly WorkflowProtocolIssue[] = [],
): WorkflowProtocolResult<T> {
  return { ok: !hasBlockingIssue(issues), value, issues: [...issues] }
}
