/**
 * Semantic validation for a structurally valid workflow document.
 *
 * Structure is already guaranteed by the protocol schema, so everything here
 * is about meaning: do the named nodes exist, do connections point at real
 * outputs and real parameters, does the graph hold together.
 *
 * Graph topology — cycles, orphan endpoints, self-edges, entry points — is
 * delegated to the execution layer's `validateWorkflow`, which the builder and
 * runtime already use. Reimplementing those rules here would let the authoring
 * path and the execution path drift apart, which is exactly how a workflow
 * ends up importable but unrunnable.
 */
import { validateWorkflow, type ValidationEdgeShape, type ValidationNodeShape } from '@lenserfight/infra/execution'
import {
  parseConnectionEndpoint,
  protocolIssue,
  type WorkflowDocument,
  type WorkflowProtocolIssue,
  type WorkflowStep,
} from '@lenserfight/domain/workflow-protocol'

import {
  catalogOutputKeys,
  isLensCatalogEntry,
  resolveWorkflowNode,
  type NodeResolution,
} from './node-resolution'

/** A step paired with the catalog entry it resolved to. */
export interface ResolvedStep {
  step: WorkflowStep
  resolution: NodeResolution
  /** Synthetic id used for graph checks and connection wiring: `step-<n>`. */
  nodeKey: string
}

export interface SemanticValidationResult {
  ok: boolean
  issues: WorkflowProtocolIssue[]
  /** Populated when every step resolved; null when resolution failed. */
  resolvedSteps: ResolvedStep[] | null
}

export function validateWorkflowSemantics(document: WorkflowDocument): SemanticValidationResult {
  const issues: WorkflowProtocolIssue[] = []

  const stepsByNumber = indexStepsByNumber(document, issues)
  const lensRefs = indexLensRefs(document, issues)
  const resolvedSteps = resolveSteps(document, issues)

  validateLensBindings(document, lensRefs, issues)
  const outputsByStep = collectDeclaredOutputs(resolvedSteps)
  validateConnections(document, stepsByNumber, outputsByStep, issues)

  // Only run graph checks once every step has a concrete node type — otherwise
  // the topology result would be about a graph we could not actually build.
  if (resolvedSteps) {
    issues.push(...runGraphValidation(document, resolvedSteps))
  }

  const ok = !issues.some((issue) => issue.severity === 'error')
  return { ok, issues, resolvedSteps }
}

// ── Step identity ───────────────────────────────────────────────────────────

function indexStepsByNumber(
  document: WorkflowDocument,
  issues: WorkflowProtocolIssue[],
): Map<number, WorkflowStep> {
  const byNumber = new Map<number, WorkflowStep>()
  document.steps.forEach((step, index) => {
    if (byNumber.has(step.step)) {
      issues.push(
        protocolIssue(
          'semantic',
          `steps.${index}.step`,
          `Duplicate step number ${step.step}. Every step needs a unique number — connections address steps by number.`,
        ),
      )
      return
    }
    byNumber.set(step.step, step)
  })
  return byNumber
}

// ── Lens definitions ────────────────────────────────────────────────────────

function indexLensRefs(
  document: WorkflowDocument,
  issues: WorkflowProtocolIssue[],
): Set<string> {
  const refs = new Set<string>()
  document.lenses?.forEach((lens, index) => {
    if (refs.has(lens.ref)) {
      issues.push(
        protocolIssue(
          'semantic',
          `lenses.${index}.ref`,
          `Duplicate lens ref "${lens.ref}". Refs identify lens definitions and must be unique.`,
        ),
      )
      return
    }
    refs.add(lens.ref)
  })
  return refs
}

function validateLensBindings(
  document: WorkflowDocument,
  lensRefs: Set<string>,
  issues: WorkflowProtocolIssue[],
): void {
  const usedRefs = new Set<string>()

  document.steps.forEach((step, index) => {
    if (step.kind !== 'lens') {
      if (step.lensRef) {
        issues.push(
          protocolIssue(
            'semantic',
            `steps.${index}.lensRef`,
            `Step ${step.step} is a "${step.kind}" step but references a lens. Only lens steps may set lensRef.`,
          ),
        )
      }
      return
    }

    if (!step.lensRef) {
      // Permitted: the importer will match or create a lens from the step name.
      issues.push(
        protocolIssue(
          'semantic',
          `steps.${index}.lensRef`,
          `Lens step ${step.step} ("${step.name}") has no lensRef. The importer will match an existing lens by name or create a new one.`,
          'warning',
        ),
      )
      return
    }

    if (!lensRefs.has(step.lensRef)) {
      issues.push(
        protocolIssue(
          'semantic',
          `steps.${index}.lensRef`,
          `Step ${step.step} references lens "${step.lensRef}", which is not defined in "lenses".`,
        ),
      )
      return
    }

    usedRefs.add(step.lensRef)
  })

  for (const ref of lensRefs) {
    if (usedRefs.has(ref)) continue
    issues.push(
      protocolIssue(
        'semantic',
        'lenses',
        `Lens "${ref}" is defined but never used by any step. It will not be created.`,
        'warning',
      ),
    )
  }
}

// ── Node resolution ─────────────────────────────────────────────────────────

function resolveSteps(
  document: WorkflowDocument,
  issues: WorkflowProtocolIssue[],
): ResolvedStep[] | null {
  const resolved: ResolvedStep[] = []
  let failed = false

  document.steps.forEach((step, index) => {
    const outcome = resolveWorkflowNode({
      kind: step.kind,
      name: step.name,
      nodeType: step.nodeType,
    })

    if (!outcome.ok) {
      failed = true
      const hint = outcome.suggestions.length
        ? ` Closest palette entries: ${outcome.suggestions.join(', ')}.`
        : ''
      issues.push(
        protocolIssue('semantic', `steps.${index}.name`, `${outcome.message}${hint}`),
      )
      return
    }

    resolved.push({
      step,
      resolution: outcome.resolution,
      nodeKey: `step-${step.step}`,
    })
  })

  return failed ? null : resolved
}

// ── Connections ─────────────────────────────────────────────────────────────

/**
 * The outputs a step is allowed to publish: what the catalog says the node
 * produces, plus anything the document explicitly declared. Documents may
 * declare extra keys because lens nodes emit author-defined fields the catalog
 * cannot know about.
 */
function collectDeclaredOutputs(
  resolvedSteps: ResolvedStep[] | null,
): Map<number, Set<string>> {
  const byStep = new Map<number, Set<string>>()
  if (!resolvedSteps) return byStep

  for (const { step, resolution } of resolvedSteps) {
    const keys = new Set<string>([
      ...catalogOutputKeys(resolution.entry),
      ...(step.outputs ?? []),
    ])
    byStep.set(step.step, keys)
  }
  return byStep
}

function validateConnections(
  document: WorkflowDocument,
  stepsByNumber: Map<number, WorkflowStep>,
  outputsByStep: Map<number, Set<string>>,
  issues: WorkflowProtocolIssue[],
): void {
  const seen = new Set<string>()

  document.connections.forEach((connection, index) => {
    const path = `connections.${index}`
    const from = parseConnectionEndpoint(connection.from)
    const to = parseConnectionEndpoint(connection.to)

    // Endpoint syntax is already enforced by the schema; this is belt and braces.
    if (!from || !to) return

    if (!stepsByNumber.has(from.step)) {
      issues.push(
        protocolIssue('semantic', `${path}.from`, `Connection source step ${from.step} does not exist.`),
      )
    }
    if (!stepsByNumber.has(to.step)) {
      issues.push(
        protocolIssue('semantic', `${path}.to`, `Connection target step ${to.step} does not exist.`),
      )
    }
    if (!stepsByNumber.has(from.step) || !stepsByNumber.has(to.step)) return

    if (from.step === to.step) {
      issues.push(
        protocolIssue('semantic', path, `Step ${from.step} cannot feed itself.`),
      )
      return
    }

    // Data must flow forward. Steps are numbered in dependency order, so a
    // backwards edge is either a typo or a loop the runtime cannot schedule.
    if (from.step > to.step) {
      issues.push(
        protocolIssue(
          'semantic',
          path,
          `Connection runs backwards (step ${from.step} into step ${to.step}). Number steps in dependency order.`,
        ),
      )
    }

    // Warning, not error. The node catalog's declared output names are known to
    // disagree with what some runners actually emit (`form_input_trigger` is
    // catalogued as `submission` but emits `formData`; `manual_trigger` spreads
    // its resolved params). Until those are reconciled, blocking an import on a
    // catalog mismatch would reject workflows that run correctly.
    const declaredOutputs = outputsByStep.get(from.step)
    if (declaredOutputs && declaredOutputs.size > 0 && !declaredOutputs.has(from.field)) {
      issues.push(
        protocolIssue(
          'semantic',
          `${path}.from`,
          `Step ${from.step} is not known to publish an output named "${from.field}". Known outputs: ${[...declaredOutputs].join(', ')}. Check the node's actual output before running.`,
          'warning',
        ),
      )
    }

    const key = `${connection.from}->${connection.to}`
    if (seen.has(key)) {
      issues.push(
        protocolIssue('semantic', path, `Duplicate connection ${key}.`, 'warning'),
      )
    }
    seen.add(key)

    // A target that receives a connection *and* a literal value is ambiguous:
    // the connection wins at runtime, so the literal is dead configuration.
    const targetStep = stepsByNumber.get(to.step)
    if (targetStep?.parameters && to.field in targetStep.parameters) {
      const literal = targetStep.parameters[to.field]
      if (typeof literal === 'string' && !literal.includes('{{')) {
        issues.push(
          protocolIssue(
            'semantic',
            `${path}.to`,
            `Step ${to.step} sets "${to.field}" to a literal value and also receives it from step ${from.step}. The connection wins; the literal is ignored.`,
            'warning',
          ),
        )
      }
    }
  })
}

// ── Graph topology (delegated) ──────────────────────────────────────────────

function runGraphValidation(
  document: WorkflowDocument,
  resolvedSteps: ResolvedStep[],
): WorkflowProtocolIssue[] {
  const nodes: ValidationNodeShape[] = resolvedSteps.map(({ step, resolution, nodeKey }) => ({
    id: nodeKey,
    kind: resolution.entry.type,
    ...(isLensCatalogEntry(resolution.entry) ? { lensId: nodeKey } : {}),
    paramLabels: Object.keys(step.parameters ?? {}),
  }))

  const edges: ValidationEdgeShape[] = []
  for (const connection of document.connections) {
    const from = parseConnectionEndpoint(connection.from)
    const to = parseConnectionEndpoint(connection.to)
    if (!from || !to) continue
    edges.push({
      sourceNodeId: `step-${from.step}`,
      targetNodeId: `step-${to.step}`,
      sourceOutputKey: from.field,
      targetParamLabel: to.field,
    })
  }

  const result = validateWorkflow(nodes, edges, { requireTriggerNode: true })

  return [...result.errors, ...result.warnings].map((issue) =>
    protocolIssue(
      'semantic',
      issue.nodeId ? `steps.${issue.nodeId}` : '',
      issue.message,
      issue.severity === 'error' ? 'error' : 'warning',
    ),
  )
}
