/**
 * WorkflowExpression — parse and resolve [[nodeId.fieldPath]] upstream refs.
 *
 * Extends the existing [[label]] placeholder convention with a dot-notation
 * variant that addresses a specific node's output field rather than an
 * edge-bound label. The dot separator distinguishes the two forms:
 *
 *   [[label]]               — resolved by resolveRenderedInputs (edge binding)
 *   [[nodeId.field.path]]   — resolved here using upstream execution results
 *
 * Expressions are stored as-is in param_overrides and resolved at runtime,
 * never eagerly collapsed into static values.
 */
import { resolveMappedOutputValue } from '@lenserfight/infra/execution'
import type { NodeOutputEnvelope } from '@lenserfight/types'

/** Matches [[nodeId.field.path]] — requires at least one dot after the nodeId. */
const UPSTREAM_REF_RE = /\[\[([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.[\]]+)\]\]/g

export interface WorkflowExpressionRef {
  /** The upstream node ID (part before the first dot). */
  nodeId: string
  /** Dot-path into the node's output data (part after the first dot). */
  fieldPath: string
  /** The full [[nodeId.fieldPath]] string as it appears in the value. */
  raw: string
}

/**
 * Extract all upstream output refs from a config value string.
 * Returns an empty array when the value contains no [[nodeId.field]] patterns.
 */
export function parseWorkflowExpression(value: string): WorkflowExpressionRef[] {
  if (!value || typeof value !== 'string') return []
  const results: WorkflowExpressionRef[] = []
  // Reset lastIndex before each use because the regex is stateful (global flag)
  UPSTREAM_REF_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = UPSTREAM_REF_RE.exec(value)) !== null) {
    results.push({
      raw: match[0],
      nodeId: match[1],
      fieldPath: match[2],
    })
  }
  return results
}

/**
 * Returns true when the value contains at least one [[nodeId.field]] ref.
 * Cheaper than calling parseWorkflowExpression when the count does not matter.
 */
export function hasWorkflowExpression(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  UPSTREAM_REF_RE.lastIndex = 0
  return UPSTREAM_REF_RE.test(value)
}

export interface UpstreamResultSnapshot {
  outputData?: Record<string, unknown>
  envelope?: NodeOutputEnvelope
}

/**
 * Replace all [[nodeId.fieldPath]] refs in `value` with their resolved values
 * drawn from `upstreamResults`. Uses the same resolveMappedOutputValue path
 * resolver that the execution engine uses for edge output keys.
 *
 * Unresolvable refs (missing nodeId, missing field) are replaced with an empty
 * string so execution can continue without crashing. The original expression
 * string is not preserved in the output — downstream nodes receive the resolved
 * string value.
 *
 * If `value` contains no refs the original string is returned unchanged,
 * preserving backward compatibility for static values.
 */
export function resolveWorkflowExpression(
  value: string,
  upstreamResults: Map<string, UpstreamResultSnapshot>,
): string {
  if (!value || typeof value !== 'string') return value
  if (!hasWorkflowExpression(value)) return value

  UPSTREAM_REF_RE.lastIndex = 0
  return value.replace(UPSTREAM_REF_RE, (_match, nodeId: string, fieldPath: string) => {
    const source = upstreamResults.get(nodeId)
    if (!source) return ''
    const resolved = resolveMappedOutputValue(
      { status: 'completed', outputData: source.outputData, envelope: source.envelope },
      fieldPath,
    )
    if (resolved === null || resolved === undefined) return ''
    if (typeof resolved === 'string') return resolved
    try {
      return JSON.stringify(resolved)
    } catch {
      return String(resolved)
    }
  })
}
