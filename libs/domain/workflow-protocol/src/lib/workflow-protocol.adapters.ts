/**
 * Document format adapters.
 *
 * The rest of the protocol never learns whether a document arrived as JSON or
 * YAML — it receives a plain JS value. Adding a third format means adding one
 * adapter here and nothing else (Protected Variations).
 *
 * Adapters do exactly one thing: text -> value, value -> text. No business
 * rules, no defaulting, no normalization.
 */
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import { protocolIssue, type WorkflowProtocolIssue } from './workflow-protocol.errors'

export const WORKFLOW_DOCUMENT_FORMATS = ['json', 'yaml'] as const
export type WorkflowDocumentFormat = (typeof WORKFLOW_DOCUMENT_FORMATS)[number]

export interface DocumentParseResult {
  value: unknown
  issues: WorkflowProtocolIssue[]
}

export interface WorkflowDocumentAdapter {
  readonly format: WorkflowDocumentFormat
  readonly label: string
  parse(text: string): DocumentParseResult
  stringify(value: unknown): string
}

/**
 * Models routinely wrap their answer in ```json fences despite being told not
 * to. Rejecting that is technically correct and practically useless, so the
 * fence is stripped before parsing and the user is told it happened.
 */
const FENCE_PATTERN = /^\s*```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n?\s*```\s*$/

export function stripCodeFence(text: string): { text: string; stripped: boolean } {
  const match = FENCE_PATTERN.exec(text)
  if (!match || match[1] === undefined) return { text, stripped: false }
  return { text: match[1], stripped: true }
}

function parseFailure(format: WorkflowDocumentFormat, error: unknown): DocumentParseResult {
  const detail = error instanceof Error ? error.message : String(error)
  return {
    value: null,
    issues: [protocolIssue('parse', '', `${format.toUpperCase()} could not be parsed: ${detail}`)],
  }
}

export const jsonWorkflowDocumentAdapter: WorkflowDocumentAdapter = {
  format: 'json',
  label: 'JSON',
  parse(text) {
    const { text: body, stripped } = stripCodeFence(text)
    const issues: WorkflowProtocolIssue[] = []
    if (stripped) {
      issues.push(
        protocolIssue('parse', '', 'Removed the surrounding markdown code fence.', 'warning'),
      )
    }
    try {
      return { value: JSON.parse(body) as unknown, issues }
    } catch (error) {
      return parseFailure('json', error)
    }
  },
  stringify(value) {
    return JSON.stringify(value, null, 2)
  },
}

export const yamlWorkflowDocumentAdapter: WorkflowDocumentAdapter = {
  format: 'yaml',
  label: 'YAML',
  parse(text) {
    const { text: body, stripped } = stripCodeFence(text)
    const issues: WorkflowProtocolIssue[] = []
    if (stripped) {
      issues.push(
        protocolIssue('parse', '', 'Removed the surrounding markdown code fence.', 'warning'),
      )
    }
    try {
      return { value: parseYaml(body) as unknown, issues }
    } catch (error) {
      return parseFailure('yaml', error)
    }
  },
  stringify(value) {
    return stringifyYaml(value, { lineWidth: 0 })
  },
}

const ADAPTERS: Record<WorkflowDocumentFormat, WorkflowDocumentAdapter> = {
  json: jsonWorkflowDocumentAdapter,
  yaml: yamlWorkflowDocumentAdapter,
}

export function getWorkflowDocumentAdapter(
  format: WorkflowDocumentFormat,
): WorkflowDocumentAdapter {
  return ADAPTERS[format]
}

/**
 * Best-effort format detection for pasted text.
 *
 * JSON is a subset of YAML, so a `{`-leading document is reported as JSON to
 * get the sharper parser error. Anything else is treated as YAML, which also
 * covers the case where the user picked the wrong tab.
 */
export function detectWorkflowDocumentFormat(text: string): WorkflowDocumentFormat {
  const { text: body } = stripCodeFence(text)
  const trimmed = body.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  return 'yaml'
}
