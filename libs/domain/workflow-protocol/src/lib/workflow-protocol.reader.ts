/**
 * The reading half of the protocol: text -> validated `WorkflowDocument`.
 *
 * Stages are kept separate and each reports its own issue stage, so a caller
 * can tell a YAML typo apart from a missing field apart from a nonsense graph.
 * Semantic validation is deliberately *not* here — it needs the node catalog,
 * which is an infra concern.
 */
import {
  detectWorkflowDocumentFormat,
  getWorkflowDocumentAdapter,
  type WorkflowDocumentFormat,
} from './workflow-protocol.adapters'
import {
  protocolFailure,
  protocolIssue,
  protocolSuccess,
  type WorkflowProtocolIssue,
  type WorkflowProtocolResult,
} from './workflow-protocol.errors'
import { normalizeWorkflowDocument } from './workflow-protocol.normalize'
import { workflowDocumentSchema, type WorkflowDocument } from './workflow-protocol.schema'

export interface ReadWorkflowDocumentOptions {
  /** Omit to auto-detect from the text. */
  format?: WorkflowDocumentFormat
}

export interface ReadWorkflowDocumentResult extends WorkflowProtocolResult<WorkflowDocument> {
  /** The format actually used, whether supplied or detected. */
  format: WorkflowDocumentFormat
}

/**
 * Validates an already-parsed value against the protocol.
 *
 * Exposed separately from `readWorkflowDocument` so callers holding a JS
 * object (an AI SDK response, a fixture) do not have to round-trip it through
 * a string first.
 */
export function validateWorkflowDocument(raw: unknown): WorkflowProtocolResult<WorkflowDocument> {
  const { document, issues: normalizationIssues } = normalizeWorkflowDocument(raw)

  const parsed = workflowDocumentSchema.safeParse(document)
  if (!parsed.success) {
    return protocolFailure([...normalizationIssues, ...toProtocolIssues(parsed.error.issues)])
  }

  return protocolSuccess(parsed.data, normalizationIssues)
}

export function readWorkflowDocument(
  text: string,
  options: ReadWorkflowDocumentOptions = {},
): ReadWorkflowDocumentResult {
  const format = options.format ?? detectWorkflowDocumentFormat(text)

  if (!text.trim()) {
    return {
      format,
      ...protocolFailure<WorkflowDocument>([
        protocolIssue('parse', '', 'Nothing to import — paste a workflow document first.'),
      ]),
    }
  }

  const adapter = getWorkflowDocumentAdapter(format)
  const { value, issues: parseIssues } = adapter.parse(text)

  if (parseIssues.some((issue) => issue.severity === 'error')) {
    return { format, ...protocolFailure<WorkflowDocument>(parseIssues) }
  }

  const validated = validateWorkflowDocument(value)
  return {
    format,
    ok: validated.ok,
    value: validated.value,
    issues: [...parseIssues, ...validated.issues],
  }
}

/**
 * Maps zod issues onto the protocol's own issue shape.
 *
 * Everything zod reports is a structural problem by construction — semantic
 * rules are enforced elsewhere, against the catalog.
 */
function toProtocolIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): WorkflowProtocolIssue[] {
  return issues.map((issue) =>
    protocolIssue('structure', issue.path.map(String).join('.'), issue.message),
  )
}
