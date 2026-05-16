// PromptResolver — input binding + merge + strict placeholder expansion.
//
// Extracted (Phase 3) from `workflow-execution.service.ts` so the simulator
// (Phase 5) and any future "explain this binding" diagnostic tool can reuse
// the exact same resolution pipeline without pulling the provider surface.
//
// Responsibilities (GRASP High Cohesion):
//   1. Group incoming edges by `target_param_label`.
//   2. Filter conditional edges whose `condition` evaluates false.
//   3. Apply `merge_strategy` per group (edge override > node default).
//   4. Merge with `rootInputs` (root loses on conflict with wired values).
//   5. Render `[[label]]` placeholders with the resolved inputs and throw
//      `PlaceholderUnboundError` when a non-optional label is missing.

import { resolveMappedOutputValue } from './output-path'
import { PlaceholderUnboundError } from './validator'

import type { LensInputContract, NodeOutputEnvelope } from '@lenserfight/types'

// ── Upstream expression resolution ───────────────────────────────────────────
//
// [[nodeId.field]] refs stored in param_overrides are distinct from edge-bound
// [[label]] placeholders: they carry a dot-separated nodeId.fieldPath that must
// be resolved against upstream execution results rather than the merged label map.
// This regex is intentionally kept inside this file to avoid a circular dep with
// the features layer; it mirrors the pattern in workflow-expression.ts.

const UPSTREAM_REF_RE = /\[\[([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.[\]]+)\]\]/g

function resolveUpstreamRefs(value: string, upstream: Map<string, ResolverUpstreamResult>): string {
  UPSTREAM_REF_RE.lastIndex = 0
  if (!UPSTREAM_REF_RE.test(value)) return value
  UPSTREAM_REF_RE.lastIndex = 0
  return value.replace(UPSTREAM_REF_RE, (_match, nodeId: string, fieldPath: string) => {
    const source = upstream.get(nodeId)
    if (!source) return ''
    const resolved = resolveMappedOutputValue(
      { status: source.status, outputData: source.outputData, envelope: source.envelope },
      fieldPath,
    )
    if (resolved === null || resolved === undefined) return ''
    if (typeof resolved === 'string') return resolved
    try { return JSON.stringify(resolved) } catch { return String(resolved) }
  })
}

export type MergeStrategy = 'last_write_wins' | 'concat' | 'array' | 'json_object'

export interface EdgeCondition {
  type: 'equals' | 'contains' | 'present' | 'truthy'
  value?: unknown
}

export interface ResolverEdge {
  sourceNodeId: string
  targetNodeId: string
  sourceOutputKey: string
  targetParamLabel: string
  mergeStrategy?: MergeStrategy | null
  condition?: EdgeCondition | null
}

export interface ResolverNode {
  id: string
  paramLabels?: string[]
  config?: { merge?: MergeStrategy; param_overrides?: Record<string, string> } | null
}

export interface ResolverUpstreamResult {
  status: string
  outputData?: Record<string, unknown>
  envelope?: NodeOutputEnvelope
}

const DEFAULT_MERGE: MergeStrategy = 'last_write_wins'

// ── Binding resolution ────────────────────────────────────────────────────

/**
 * Collapse edges + upstream results + rootInputs into the final
 * `label → value` map the prompt renderer consumes.
 *
 * `upstream.get(sourceNodeId)` may return undefined if the node has not yet
 * run; such edges are treated as absent (the engine should not have called
 * this function until all parents are terminal).
 */
export function resolveRenderedInputs(
  node: ResolverNode,
  edges: ResolverEdge[],
  upstream: Map<string, ResolverUpstreamResult>,
  rootInputs: Record<string, unknown>,
): Record<string, unknown> {
  const incoming = edges.filter((e) => e.targetNodeId === node.id)
  const grouped = new Map<string, ResolverEdge[]>()
  for (const edge of incoming) {
    const list = grouped.get(edge.targetParamLabel) ?? []
    list.push(edge)
    grouped.set(edge.targetParamLabel, list)
  }

  const defaultMerge: MergeStrategy = node.config?.merge ?? DEFAULT_MERGE
  const rendered: Record<string, unknown> = { ...rootInputs }

  for (const [label, group] of grouped.entries()) {
    const values: { sourceNodeId: string; value: unknown }[] = []
    for (const edge of group) {
      if (!isEdgeConditionSatisfied(edge, upstream)) continue
      const source = upstream.get(edge.sourceNodeId)
      if (!source || source.status !== 'completed') continue
      const value = resolveMappedOutputValue(source, edge.sourceOutputKey)
      values.push({ sourceNodeId: edge.sourceNodeId, value })
    }
    if (values.length === 0) {
      rendered[label] = rendered[label] ?? ''
      continue
    }
    const strategy: MergeStrategy = group[0]?.mergeStrategy ?? defaultMerge
    rendered[label] = applyMerge(strategy, values)
  }

  // ── Resolve [[nodeId.field]] expressions in param_overrides ───────────────
  // Config fields may contain upstream output refs (set by the user in the
  // WorkflowNodeConfigPanel via drag-and-drop or manual typing).  Resolve them
  // here so runners receive fully substituted values in resolvedParams.
  const paramOverrides = node.config?.param_overrides
  if (paramOverrides) {
    for (const [key, value] of Object.entries(paramOverrides)) {
      if (typeof value === 'string') {
        UPSTREAM_REF_RE.lastIndex = 0
        rendered[key] = UPSTREAM_REF_RE.test(value)
          ? resolveUpstreamRefs(value, upstream)
          : value
      } else {
        rendered[key] = value
      }
    }
  }

  return rendered
}

export function isEdgeConditionSatisfied(
  edge: ResolverEdge,
  upstream: Map<string, ResolverUpstreamResult>,
): boolean {
  if (!edge.condition) return true
  const source = upstream.get(edge.sourceNodeId)
  if (!source || source.status !== 'completed') return false
  const sourceValue = resolveMappedOutputValue(source, edge.sourceOutputKey)
  switch (edge.condition.type) {
    case 'present':
      return sourceValue !== null && sourceValue !== undefined && sourceValue !== ''
    case 'truthy':
      return Boolean(sourceValue)
    case 'equals':
      return safeStringify(sourceValue) === safeStringify(edge.condition.value)
    case 'contains':
      return typeof sourceValue === 'string' && typeof edge.condition.value === 'string'
        ? sourceValue.includes(edge.condition.value)
        : false
  }
}

function applyMerge(
  strategy: MergeStrategy,
  values: { sourceNodeId: string; value: unknown }[],
): unknown {
  switch (strategy) {
    case 'last_write_wins':
      return values[values.length - 1]?.value ?? ''
    case 'concat':
      return values.map((v) => safeStringify(v.value)).join('\n\n')
    case 'array':
      return values.map((v) => v.value)
    case 'json_object': {
      const obj: Record<string, unknown> = {}
      for (const v of values) obj[v.sourceNodeId] = v.value
      return obj
    }
  }
}

// ── Prompt rendering ──────────────────────────────────────────────────────

/**
 * Unresolved placeholder pattern. Matches `[[label]]`, `[ label ]`,
 * `{{label}}`. See `renderPrompt` for strictness semantics.
 */
const UNRESOLVED_PLACEHOLDER_RE = /(?:\[\[\s*([a-z0-9_ \-]+?)\s*\]\])|(?:\{\{\s*([a-z0-9_ \-]+?)\s*\}\})|(?:\[\s+([a-z0-9_ \-]+?)\s+\])/i

export function replaceTokenVariants(prompt: string, rawKey: string, value: unknown): string {
  const valueStr = typeof value === 'string' ? value : safeStringify(value)
  const normalized = rawKey.trim().replace(/\s+/g, '_').toLowerCase()
  const keyPattern = escapeRegExp(rawKey.trim()).replace(/_/g, '[ _]+')
  const normalizedPattern = escapeRegExp(normalized).replace(/_/g, '[ _]+')

  return prompt
    .replaceAll(`[[${rawKey}]]`, valueStr)
    .replaceAll(`[[${normalized}]]`, valueStr)
    .replaceAll(`{{${rawKey}}}`, valueStr)
    .replaceAll(`{{${normalized}}}`, valueStr)
    .replace(new RegExp(`\\[\\s+${keyPattern}\\s+\\]`, 'gi'), valueStr)
    .replace(new RegExp(`\\[\\s+${normalizedPattern}\\s+\\]`, 'gi'), valueStr)
}

/**
 * Render a prompt template with bindings. Throws `PlaceholderUnboundError`
 * when a leftover placeholder survived expansion unless the input contract
 * explicitly marks that label optional.
 */
export function renderPrompt(
  template: string,
  rendered: Record<string, unknown>,
  inputContract?: LensInputContract | null,
): string {
  let prompt = template
  for (const [key, value] of Object.entries(rendered)) {
    prompt = replaceTokenVariants(prompt, key, value)
  }

  const leftover = UNRESOLVED_PLACEHOLDER_RE.exec(prompt)
  if (leftover) {
    const label = (leftover[1] ?? leftover[2] ?? leftover[3] ?? '').trim()
    if (label && !isLabelOptional(inputContract, label)) {
      throw new PlaceholderUnboundError(label)
    }
  }
  return prompt
}

function isLabelOptional(contract: LensInputContract | null | undefined, label: string): boolean {
  if (!contract) return false
  const normalized = label.trim().replace(/\s+/g, '_').toLowerCase()
  for (const [k, field] of Object.entries(contract.fields ?? {})) {
    const keyNorm = k.trim().replace(/\s+/g, '_').toLowerCase()
    if (keyNorm === normalized) {
      return field.required !== true
    }
  }
  return false
}

// ── Shared utilities ──────────────────────────────────────────────────────

function safeStringify(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
