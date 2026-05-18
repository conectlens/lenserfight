// Workflow validator — Phase 2 of the Lens Workflow Engine Blueprint.
//
// This module owns every STRUCTURAL validation that must succeed before a
// workflow can be persisted or executed. It intentionally does NOT depend on
// providers, moderation or lens templates; its only inputs are the graph
// shape + optional root inputs.
//
// Covered rules (Blueprint §4 + §6.1):
//   1. Cycle detection (Kahn).
//   2. Binding completeness — every `target_param_label` is satisfied by an
//      incoming edge, a root input, or an optional/default field.
//   3. Routing node shape — ≥2 outbound edges with `condition.type='equals'`
//      on the `route` key, each a distinct route value.
//   4. Validation node edges — at least one outbound edge MUST declare an
//      `onFail` policy (skip_downstream / fail_run / divert_to_branch).
//   5. Orchestration caps — declare `maxDepth` and `maxGeneratedNodes`.
//
// Runtime placeholder-unbound enforcement lives in `renderPrompt` in
// `workflow-execution.service.ts` — it cannot run at save time because
// lens template bodies are fetched lazily.

import type { LensInputContract } from '@lenserfight/types'

// ── Public types ──────────────────────────────────────────────────────────

export interface ValidationIssue {
  severity: 'error' | 'warn' | 'info'
  code: ValidationCode
  nodeId?: string
  edgeId?: string
  message: string
  details?: Record<string, unknown>
}

export type ValidationCode =
  | 'cycle_detected'
  | 'orphan_source'
  | 'orphan_target'
  | 'self_edge'
  | 'missing_binding'
  | 'routing_insufficient_edges'
  | 'routing_missing_equals'
  | 'routing_duplicate_route'
  | 'validation_missing_policy'
  | 'orchestration_missing_caps'
  | 'duplicate_node_id'
  | 'no_trigger_node'

/**
 * The complete set of workflow node types that qualify as entry/trigger nodes.
 * Exported so builder UI and execution service can gate on the same set without
 * duplicating the list.
 */
export const TRIGGER_NODE_TYPES = new Set<string>([
  'manual_trigger',
  'event_trigger',
  'form_input_trigger',
  'webhook_trigger',
  'schedule_trigger',
])

export interface ValidationNodeShape {
  id: string
  lensId?: string
  versionId?: string | null
  /** Lens kind classifier (text / routing / validation / orchestration / ...). */
  kind?: string
  /** Rendered `[[label]]` names the template consumes. */
  paramLabels?: string[]
  /** Optional per-node execution policy (onParentFailure, merge, retry, orchestration caps…). */
  config?: Record<string, unknown> | null
  /** Optional input contract — used to relax binding rules for optional fields. */
  inputContract?: LensInputContract | null
}

export interface ValidationEdgeShape {
  id?: string
  sourceNodeId: string
  targetNodeId: string
  sourceOutputKey?: string
  targetParamLabel?: string
  condition?: {
    type: 'equals' | 'contains' | 'present' | 'truthy'
    value?: unknown
  } | null
  /**
   * Policy applied when the source node (a validation lens) fails:
   *   * skip_downstream — target becomes skipped.
   *   * fail_run        — run transitions to failed.
   *   * divert_to_branch — router-style fallback.
   */
  onFail?: 'skip_downstream' | 'fail_run' | 'divert_to_branch' | null
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  /** Nodes that participate in a cycle, if detected. */
  cycleNodes: string[] | null
}

// ── Cycle detection (Kahn) ────────────────────────────────────────────────

/**
 * Detects cycles in a workflow DAG using Kahn's topological sort.
 * Returns the IDs of nodes involved in a cycle, or null if acyclic.
 *
 * Moved out of `WorkflowExecutionService.detectCycle` so Phase 5 (simulation)
 * and any editor-time validator can reuse the exact same algorithm without
 * pulling in the provider surface.
 */
export function detectCycle(
  nodes: { id: string }[],
  edges: { sourceNodeId: string; targetNodeId: string }[],
): string[] | null {
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  const adjList = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

  for (const edge of edges) {
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
    adjList.get(edge.sourceNodeId)?.push(edge.targetNodeId)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  let processed = 0
  let qi = 0
  while (qi < queue.length) {
    const current = queue[qi++]
    processed++
    for (const neighbor of adjList.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  if (processed === nodes.length) return null
  return nodes.filter((n) => !queue.includes(n.id)).map((n) => n.id)
}

// ── PlaceholderUnbound error (runtime) ────────────────────────────────────

/**
 * Raised by `renderPrompt` when a `[[label]]` / `{{label}}` placeholder was
 * not resolved AND the corresponding input contract field was not marked
 * optional. Caught by the engine and surfaced as `node.blocked` with
 * `errorCode=placeholder_unbound`.
 */
export class PlaceholderUnboundError extends Error {
  public readonly code = 'placeholder_unbound'
  constructor(public readonly label: string) {
    super(`Unresolved placeholder: [[${label}]]`)
    this.name = 'PlaceholderUnboundError'
  }
}

// ── Save-time structural validator ────────────────────────────────────────

export interface ValidateWorkflowOptions {
  /**
   * Root-level inputs the engine will supply at run time. Used to satisfy
   * target param labels that have no incoming edge.
   */
  rootInputs?: Record<string, unknown>
  /**
   * When true, emit warnings (not errors) for nodes missing an explicit
   * input contract. Default true — most editors don't load contracts upfront.
   */
  contractOptional?: boolean
  /**
   * When true, the absence of a trigger/input node among the DAG roots is
   * treated as an error (blocking execution). When false (default), it is
   * a non-blocking warning shown in the editor.
   */
  requireTriggerNode?: boolean
}

/**
 * Validate a workflow graph against the Blueprint ruleset (§4). Returns an
 * ordered list of issues; `ok` is true iff no `error`-severity issue was
 * collected. Never throws — callers decide whether to block save on
 * `warnings`.
 */
export function validateWorkflow(
  nodes: ValidationNodeShape[],
  edges: ValidationEdgeShape[],
  options: ValidateWorkflowOptions = {},
): ValidationResult {
  const issues: ValidationIssue[] = []
  const rootInputs = options.rootInputs ?? {}

  // 0. Duplicate ids
  {
    const seen = new Set<string>()
    for (const n of nodes) {
      if (seen.has(n.id)) {
        issues.push({
          severity: 'error',
          code: 'duplicate_node_id',
          nodeId: n.id,
          message: `Duplicate node id "${n.id}"`,
        })
      }
      seen.add(n.id)
    }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // 1. Orphan / self edges
  for (const e of edges) {
    if (!nodeMap.has(e.sourceNodeId)) {
      issues.push({
        severity: 'error',
        code: 'orphan_source',
        edgeId: e.id,
        message: `Edge source "${e.sourceNodeId}" is not a node in the graph`,
      })
    }
    if (!nodeMap.has(e.targetNodeId)) {
      issues.push({
        severity: 'error',
        code: 'orphan_target',
        edgeId: e.id,
        message: `Edge target "${e.targetNodeId}" is not a node in the graph`,
      })
    }
    if (e.sourceNodeId === e.targetNodeId) {
      issues.push({
        severity: 'error',
        code: 'self_edge',
        edgeId: e.id,
        nodeId: e.sourceNodeId,
        message: `Self-edge on node "${e.sourceNodeId}" is not allowed`,
      })
    }
  }

  // 2. Cycle detection
  const cycleNodes = detectCycle(
    nodes.map((n) => ({ id: n.id })),
    edges.map((e) => ({ sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId })),
  )
  if (cycleNodes && cycleNodes.length > 0) {
    issues.push({
      severity: 'error',
      code: 'cycle_detected',
      message: `Cycle detected involving nodes: ${cycleNodes.join(', ')}`,
      details: { nodeIds: cycleNodes },
    })
  }

  // 3. Binding completeness
  for (const node of nodes) {
    const labels = node.paramLabels ?? []
    if (labels.length === 0) continue

    const incoming = edges.filter((e) => e.targetNodeId === node.id)
    const boundLabels = new Set(
      incoming.map((e) => (e.targetParamLabel ?? '').trim()).filter(Boolean),
    )

    for (const rawLabel of labels) {
      const label = rawLabel.trim()
      if (!label) continue
      if (boundLabels.has(label)) continue
      if (hasRootInput(rootInputs, label)) continue
      if (isContractOptional(node.inputContract ?? null, label)) continue

      issues.push({
        severity: 'error',
        code: 'missing_binding',
        nodeId: node.id,
        message: `Param "${label}" on node "${node.id}" has no incoming edge, no root input, and no contract default`,
        details: { label },
      })
    }
  }

  // 4. Routing-node shape
  for (const node of nodes) {
    if (node.kind !== 'routing') continue
    const outgoing = edges.filter((e) => e.sourceNodeId === node.id)
    if (outgoing.length < 2) {
      issues.push({
        severity: 'error',
        code: 'routing_insufficient_edges',
        nodeId: node.id,
        message: `Routing node "${node.id}" must have ≥2 outbound edges; found ${outgoing.length}`,
      })
    }

    const seenRoutes = new Map<string, number>()
    for (const e of outgoing) {
      const cond = e.condition
      if (!cond || cond.type !== 'equals' || cond.value === undefined || cond.value === null) {
        issues.push({
          severity: 'error',
          code: 'routing_missing_equals',
          nodeId: node.id,
          edgeId: e.id,
          message: `Routing edge from "${node.id}" must declare condition.type='equals' with a value`,
        })
        continue
      }
      const key = String(cond.value)
      seenRoutes.set(key, (seenRoutes.get(key) ?? 0) + 1)
    }
    for (const [value, count] of seenRoutes) {
      if (count > 1) {
        issues.push({
          severity: 'warn',
          code: 'routing_duplicate_route',
          nodeId: node.id,
          message: `Routing node "${node.id}" has ${count} edges with route value "${value}". Only one will be satisfied deterministically.`,
          details: { value, count },
        })
      }
    }
  }

  // 5. Validation-node outbound edge policy
  for (const node of nodes) {
    if (node.kind !== 'validation') continue
    const outgoing = edges.filter((e) => e.sourceNodeId === node.id)
    if (outgoing.length === 0) continue
    const anyPolicy = outgoing.some((e) => !!e.onFail)
    if (!anyPolicy) {
      issues.push({
        severity: 'error',
        code: 'validation_missing_policy',
        nodeId: node.id,
        message: `Validation node "${node.id}" must have at least one outbound edge with an onFail policy (skip_downstream, fail_run, or divert_to_branch)`,
      })
    }
  }

  // 6. Orchestration caps
  for (const node of nodes) {
    if (node.kind !== 'orchestration') continue
    const cfg = (node.config ?? {}) as Record<string, unknown>
    const maxDepth = toNumber(cfg['maxDepth'])
    const maxGeneratedNodes = toNumber(cfg['maxGeneratedNodes'])
    if (maxDepth == null || maxGeneratedNodes == null) {
      issues.push({
        severity: 'warn',
        code: 'orchestration_missing_caps',
        nodeId: node.id,
        message: `Orchestration node "${node.id}" should declare config.maxDepth and config.maxGeneratedNodes to prevent runaway subflows`,
      })
    }
  }

  // 7. Trigger/input node presence
  // A well-formed executable workflow must have at least one trigger or input
  // node as a DAG root. Partial sub-workflows may omit this — callers opt in
  // to error-severity by passing requireTriggerNode: true.
  {
    const inDegreeForTriggerCheck = new Map<string, number>()
    for (const n of nodes) inDegreeForTriggerCheck.set(n.id, 0)
    for (const e of edges) {
      if (nodeMap.has(e.targetNodeId)) {
        inDegreeForTriggerCheck.set(
          e.targetNodeId,
          (inDegreeForTriggerCheck.get(e.targetNodeId) ?? 0) + 1,
        )
      }
    }
    const rootNodes = nodes.filter((n) => (inDegreeForTriggerCheck.get(n.id) ?? 0) === 0)
    const hasTrigger = rootNodes.some((n) => TRIGGER_NODE_TYPES.has(n.kind ?? ''))
    if (!hasTrigger && nodes.length > 0) {
      issues.push({
        severity: options.requireTriggerNode ? 'error' : 'warn',
        code: 'no_trigger_node',
        message:
          'Workflow has no trigger/input node. Add a Manual Trigger, Webhook Trigger, ' +
          'Schedule Trigger, Event Trigger, or Form Input Trigger as the entry point.',
      })
    }
  }

  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity !== 'error')

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    cycleNodes,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function hasRootInput(rootInputs: Record<string, unknown>, label: string): boolean {
  if (!(label in rootInputs)) {
    // tolerate whitespace variants — the engine normalises labels the same way
    const normalized = label.trim().replace(/\s+/g, '_').toLowerCase()
    return Object.keys(rootInputs).some((k) => k.trim().replace(/\s+/g, '_').toLowerCase() === normalized)
  }
  const v = rootInputs[label]
  return v !== undefined && v !== null && v !== ''
}

function isContractOptional(contract: LensInputContract | null, label: string): boolean {
  if (!contract) return false
  const field = contract.fields?.[label]
  if (!field) return false
  return field.required !== true
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}
