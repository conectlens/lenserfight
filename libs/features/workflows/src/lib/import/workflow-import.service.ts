/**
 * Workflow import — the one place the import use case is coordinated.
 *
 * GRASP Controller: every stage of "turn this document into a working
 * workflow" happens here, in order, so the sequence can be read top to bottom
 * and tested without React. Components call `importWorkflow` and render the
 * result; they do not orchestrate anything themselves.
 *
 * ## Atomicity
 *
 * There is no client-reachable transaction spanning lenses, workflows, nodes,
 * edges, and schedules, so atomicity is achieved by ordering plus
 * compensation:
 *
 *   1. Everything that can be validated without writing is validated first.
 *      An invalid document never touches the database.
 *   2. Writes are tracked as they succeed.
 *   3. Any failure after the first write triggers compensation, which deletes
 *      **only** what this import created. A reused lens is never touched.
 *
 * The observable outcome is all-or-nothing: either a complete workflow, or no
 * new resources. What compensation cannot promise is instantaneity — a
 * concurrent reader could briefly observe a partial workflow.
 */
import {
  readWorkflowDocument,
  type WorkflowDocument,
  type WorkflowDocumentFormat,
  type WorkflowProtocolIssue,
} from '@lenserfight/domain/workflow-protocol'
import {
  buildWorkflowEdgeInputs,
  buildWorkflowNodeInputs,
  validateWorkflowSemantics,
  type ResolvedStep,
} from '@lenserfight/infra/workflow-authoring'

import {
  resolveLensDefinitions,
  type LensResolutionEntry,
  type LensResolverDeps,
} from './lens-resolution'

import type {
  UpsertEdgeInput,
  UpsertNodeInput,
  WorkflowRecord,
} from '@lenserfight/data/repositories'
import type { UpsertWorkflowScheduleInput } from '@lenserfight/types'

// ── Ports ───────────────────────────────────────────────────────────────────

/**
 * Everything the orchestrator needs from the outside world, as plain
 * functions. Injected rather than imported so the whole flow — including
 * rollback — is testable with fakes.
 */
export interface WorkflowImportDeps extends LensResolverDeps {
  createWorkflow: (input: {
    title: string
    description?: string
    visibility?: 'public' | 'private' | 'unlisted'
  }) => Promise<WorkflowRecord>
  upsertNodes: (
    workflowId: string,
    nodes: UpsertNodeInput[],
  ) => Promise<{ id: string }[]>
  upsertEdges: (workflowId: string, edges: UpsertEdgeInput[]) => Promise<unknown>
  upsertSchedule: (input: UpsertWorkflowScheduleInput) => Promise<unknown>
  /** Compensation hooks. Failures here are reported, never rethrown. */
  deleteWorkflow: (workflowId: string) => Promise<void>
  deleteLens: (lensId: string) => Promise<void>
}

// ── Preview ─────────────────────────────────────────────────────────────────

export interface WorkflowImportPreview {
  ok: boolean
  format: WorkflowDocumentFormat
  document: WorkflowDocument | null
  issues: WorkflowProtocolIssue[]
  /** Per-step summary for the confirmation table. */
  steps: {
    step: number
    kind: string
    name: string
    nodeType: string
    parameterCount: number
  }[]
  connectionCount: number
  lensDefinitionCount: number
  /** Present when the document carries a schedule. */
  schedule: { cron: string; isActive: boolean } | null
}

/**
 * Validates a pasted document and describes what an import would do.
 *
 * Read-only: nothing is written, so the user can iterate on a broken document
 * without leaving debris behind.
 */
export function previewWorkflowImport(
  text: string,
  format?: WorkflowDocumentFormat,
): WorkflowImportPreview {
  const read = readWorkflowDocument(text, format ? { format } : {})

  if (!read.ok || !read.value) {
    return {
      ok: false,
      format: read.format,
      document: null,
      issues: read.issues,
      steps: [],
      connectionCount: 0,
      lensDefinitionCount: 0,
      schedule: null,
    }
  }

  const document = read.value
  const semantics = validateWorkflowSemantics(document)
  const issues = [...read.issues, ...semantics.issues]

  return {
    ok: semantics.ok,
    format: read.format,
    document,
    issues,
    steps: (semantics.resolvedSteps ?? []).map((resolved) => ({
      step: resolved.step.step,
      kind: resolved.step.kind,
      name: resolved.step.name,
      nodeType: resolved.resolution.entry.type,
      parameterCount: Object.keys(resolved.step.parameters ?? {}).length,
    })),
    connectionCount: document.connections.length,
    lensDefinitionCount: document.lenses?.length ?? 0,
    schedule: document.schedule
      ? { cron: document.schedule.cron, isActive: document.schedule.isActive }
      : null,
  }
}

// ── Import ──────────────────────────────────────────────────────────────────

export interface WorkflowImportOptions {
  /** Wizard-owned metadata. Visibility is deliberately not in the protocol. */
  visibility?: 'public' | 'private' | 'unlisted'
  /** Overrides the document title when the user edited it in the wizard. */
  title?: string
  description?: string
  /**
   * Whether to activate an imported schedule. Defaults to false regardless of
   * what the document asked for — a pasted document does not get to start
   * firing jobs on the importing user's account without a deliberate click.
   */
  activateSchedule?: boolean
}

export interface WorkflowImportResult {
  ok: boolean
  workflowId: string | null
  issues: WorkflowProtocolIssue[]
  warnings: string[]
  lenses: LensResolutionEntry[]
  nodeCount: number
  edgeCount: number
  /** True when a failure triggered compensation. */
  rolledBack: boolean
}

export async function importWorkflow(
  text: string,
  deps: WorkflowImportDeps,
  options: WorkflowImportOptions = {},
  format?: WorkflowDocumentFormat,
): Promise<WorkflowImportResult> {
  // ── Phase 1: validate everything before writing anything ──────────────────
  const preview = previewWorkflowImport(text, format)
  if (!preview.ok || !preview.document) {
    return failed(preview.issues)
  }

  const document = preview.document
  const semantics = validateWorkflowSemantics(document)
  if (!semantics.ok || !semantics.resolvedSteps) {
    return failed(semantics.issues)
  }

  const carriedIssues = preview.issues.filter((issue) => issue.severity === 'warning')

  // ── Phase 2: write, tracking everything we create ─────────────────────────
  const createdLensIds: string[] = []
  let workflowId: string | null = null
  const warnings: string[] = []
  let lenses: LensResolutionEntry[] = []

  try {
    const lensOutcome = await resolveLensDefinitions(document.lenses ?? [], deps)
    lenses = lensOutcome.entries
    createdLensIds.push(...lensOutcome.createdLensIds)
    warnings.push(...lensOutcome.warnings)

    const lensIdByStep = mapLensIdsToSteps(semantics.resolvedSteps, lensOutcome.entries)

    const workflow = await deps.createWorkflow({
      title: options.title?.trim() || document.title,
      ...(options.description ?? document.description
        ? { description: options.description ?? document.description }
        : {}),
      visibility: options.visibility ?? 'private',
    })
    workflowId = workflow.id

    const plan = buildWorkflowNodeInputs(document, semantics.resolvedSteps, { lensIdByStep })
    const nodeRecords = await deps.upsertNodes(workflow.id, plan.inputs)

    if (nodeRecords.length !== plan.inputs.length) {
      throw new Error(
        `Expected ${plan.inputs.length} nodes to be created but received ${nodeRecords.length}.`,
      )
    }

    const nodeIdByKey = new Map<string, string>()
    plan.nodeKeys.forEach((key, index) => {
      const record = nodeRecords[index]
      if (record) nodeIdByKey.set(key, record.id)
    })

    const edgeInputs = buildWorkflowEdgeInputs(document, { nodeIdByKey })
    if (edgeInputs.length > 0) {
      await deps.upsertEdges(workflow.id, edgeInputs)
    }

    if (document.schedule) {
      const shouldActivate = options.activateSchedule === true && document.schedule.isActive
      await deps.upsertSchedule({
        workflow_id: workflow.id,
        cron_expr: document.schedule.cron,
        is_active: shouldActivate,
        ...(document.schedule.timezone ? { timezone: document.schedule.timezone } : {}),
      })
      if (document.schedule.isActive && !shouldActivate) {
        warnings.push(
          `The schedule "${document.schedule.cron}" was created paused. Activate it from the Run panel when you are ready.`,
        )
      }
    }

    return {
      ok: true,
      workflowId: workflow.id,
      issues: carriedIssues,
      warnings,
      lenses,
      nodeCount: plan.inputs.length,
      edgeCount: edgeInputs.length,
      rolledBack: false,
    }
  } catch (error) {
    const compensation = await compensate(deps, workflowId, createdLensIds)
    return {
      ok: false,
      workflowId: null,
      issues: [
        ...carriedIssues,
        {
          stage: 'persistence',
          severity: 'error',
          path: '',
          message: error instanceof Error ? error.message : 'Failed to save the workflow.',
        },
      ],
      warnings: [...warnings, ...compensation],
      lenses,
      nodeCount: 0,
      edgeCount: 0,
      rolledBack: true,
    }
  }
}

/**
 * Deletes only what this import created, newest first.
 *
 * Compensation failures are collected and surfaced rather than thrown: the
 * user is already looking at one error, and replacing it with a cleanup error
 * would hide the actual cause.
 */
async function compensate(
  deps: WorkflowImportDeps,
  workflowId: string | null,
  createdLensIds: readonly string[],
): Promise<string[]> {
  const problems: string[] = []

  if (workflowId) {
    try {
      await deps.deleteWorkflow(workflowId)
    } catch {
      problems.push(
        `Import failed and the partially created workflow could not be removed automatically. Delete it manually if it appears in your list.`,
      )
    }
  }

  for (const lensId of createdLensIds) {
    try {
      await deps.deleteLens(lensId)
    } catch {
      problems.push(
        `A lens created during the failed import could not be removed automatically (id ${lensId}).`,
      )
    }
  }

  return problems
}

function mapLensIdsToSteps(
  resolvedSteps: readonly ResolvedStep[],
  entries: readonly LensResolutionEntry[],
): Map<number, string> {
  const lensIdByRef = new Map(entries.map((entry) => [entry.ref, entry.lensId]))
  const byStep = new Map<number, string>()

  for (const resolved of resolvedSteps) {
    const ref = resolved.step.lensRef
    if (!ref) continue
    const lensId = lensIdByRef.get(ref)
    if (lensId) byStep.set(resolved.step.step, lensId)
  }

  return byStep
}

function failed(issues: WorkflowProtocolIssue[]): WorkflowImportResult {
  return {
    ok: false,
    workflowId: null,
    issues,
    warnings: [],
    lenses: [],
    nodeCount: 0,
    edgeCount: 0,
    rolledBack: false,
  }
}
