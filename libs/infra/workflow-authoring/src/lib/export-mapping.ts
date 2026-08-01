/**
 * Boundary mapping: persisted workflow -> protocol document.
 *
 * The inverse of `persistence-mapping`. Together they close the loop the
 * feature promises: import a document, edit it in the canvas, export it, and
 * import the result again without losing protocol information.
 *
 * Everything internal is dropped here rather than filtered downstream — node
 * ids, lens ids, positions, funding, credentials, visibility. If a field is
 * not in the protocol, it does not leave this function.
 */
import {
  WORKFLOW_PROTOCOL_ID,
  formatConnectionEndpoint,
  type LensDefinition,
  type WorkflowDocument,
  type WorkflowStep,
  type WorkflowStepKind,
} from '@lenserfight/domain/workflow-protocol'
import {
  getWorkflowNodeCatalogEntry,
  type WorkflowNodeCategory,
} from '@lenserfight/infra/execution'

import { LENS_NODE_TYPE } from './node-resolution'

import type {
  WorkflowEdgeRecord,
  WorkflowNodeRecord,
  WorkflowRecord,
} from '@lenserfight/data/repositories'

/** Config keys that must never appear in a portable document. */
const NON_PORTABLE_CONFIG_KEYS = new Set([
  'node_type',
  'nodeType',
  'funding_source',
  'fundingSource',
  'key_ref_id',
  'local_key_id',
  'byok_key_ref_id',
  'model_id',
])

const CATEGORY_TO_KIND: Record<WorkflowNodeCategory, WorkflowStepKind> = {
  trigger: 'trigger',
  lens: 'lens',
  logic: 'logic',
  data: 'tool',
  ai_primitive: 'tool',
  battle: 'tool',
  storage: 'tool',
  communication: 'tool',
  integration: 'tool',
  media: 'tool',
  utility: 'tool',
}

/** A lens definition the caller resolved for a lens-bearing node. */
export interface ExportLensSource {
  id: string
  title: string
  description?: string | null
  instructions?: string | null
  parameterLabels?: string[]
}

export interface BuildWorkflowDocumentOptions {
  workflow: Pick<WorkflowRecord, 'title' | 'description'>
  nodes: readonly WorkflowNodeRecord[]
  edges: readonly WorkflowEdgeRecord[]
  /** Lens records keyed by lens id, for nodes that reference one. */
  lensesById?: ReadonlyMap<string, ExportLensSource>
  /** Active schedule, if the workflow has one. */
  schedule?: { cron: string; timezone?: string | null; isActive: boolean } | null
  outcome?: string | null
  finalOutput?: string | null
}

/**
 * Projects a persisted workflow onto a protocol document.
 *
 * Step numbers are assigned from node ordinal so that the exported document is
 * stable across exports and its connections stay readable.
 */
export function buildWorkflowDocument(
  options: BuildWorkflowDocumentOptions,
): WorkflowDocument {
  const ordered = [...options.nodes].sort(
    (left, right) => left.ordinal - right.ordinal || left.id.localeCompare(right.id),
  )

  const stepNumberByNodeId = new Map<string, number>()
  ordered.forEach((node, index) => stepNumberByNodeId.set(node.id, index + 1))

  const lensRefByLensId = new Map<string, string>()
  const lenses: LensDefinition[] = []

  for (const node of ordered) {
    if (!node.lens_id) continue
    if (lensRefByLensId.has(node.lens_id)) continue
    const source = options.lensesById?.get(node.lens_id)
    const ref = buildLensRef(source?.title ?? node.label ?? node.lens_id, lensRefByLensId)
    lensRefByLensId.set(node.lens_id, ref)
    if (!source) continue
    lenses.push(toLensDefinition(ref, source))
  }

  const steps: WorkflowStep[] = ordered.map((node, index) => {
    const nodeType = readNodeType(node) ?? LENS_NODE_TYPE
    const entry = getWorkflowNodeCatalogEntry(nodeType)
    const kind: WorkflowStepKind = entry ? CATEGORY_TO_KIND[entry.category] : 'tool'

    const step: WorkflowStep = {
      step: index + 1,
      kind,
      name: node.label?.trim() || entry?.displayName || nodeType,
      nodeType,
      ...(node.lens_id && lensRefByLensId.has(node.lens_id)
        ? { lensRef: lensRefByLensId.get(node.lens_id) }
        : {}),
      ...(entry ? { outputs: entry.outputs.map((output) => output.name) } : {}),
    }

    const parameters = readParameters(node)
    if (Object.keys(parameters).length > 0) step.parameters = parameters

    return step
  })

  const connections = options.edges.flatMap((edge) => {
    const fromStep = stepNumberByNodeId.get(edge.source_node_id)
    const toStep = stepNumberByNodeId.get(edge.target_node_id)
    if (fromStep === undefined || toStep === undefined) return []
    return [
      {
        from: formatConnectionEndpoint(fromStep, edge.source_output_key),
        to: formatConnectionEndpoint(toStep, edge.target_param_label),
      },
    ]
  })

  const document: WorkflowDocument = {
    protocol: WORKFLOW_PROTOCOL_ID,
    title: options.workflow.title,
    steps,
    connections,
  }

  if (options.workflow.description) document.description = options.workflow.description
  if (options.outcome) document.outcome = options.outcome
  if (options.finalOutput) document.finalOutput = options.finalOutput
  if (lenses.length > 0) document.lenses = lenses
  if (options.schedule) {
    document.schedule = {
      cron: options.schedule.cron,
      isActive: options.schedule.isActive,
      ...(options.schedule.timezone ? { timezone: options.schedule.timezone } : {}),
    }
  }

  return document
}

function readNodeType(node: WorkflowNodeRecord): string | null {
  const config = node.config
  if (!config || typeof config !== 'object') return null
  const raw = (config as Record<string, unknown>)['node_type'] ?? (config as Record<string, unknown>)['nodeType']
  return typeof raw === 'string' && raw ? raw : null
}

/**
 * Reads a node's authored parameters back out of `param_overrides`, undoing
 * the `__` prefix so the exported document uses the same key the author typed.
 */
function readParameters(node: WorkflowNodeRecord): Record<string, unknown> {
  const config = node.config
  if (!config || typeof config !== 'object') return {}

  const raw = (config as Record<string, unknown>)['param_overrides']
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const parameters: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const cleaned = key.startsWith('__') ? key.slice(2) : key
    if (NON_PORTABLE_CONFIG_KEYS.has(cleaned)) continue
    if (value === null || value === undefined || value === '') continue
    parameters[cleaned] = value
  }
  return parameters
}

function toLensDefinition(ref: string, source: ExportLensSource): LensDefinition {
  const definition: LensDefinition = { ref, title: source.title }
  if (source.description) definition.description = source.description
  if (source.instructions) definition.instructions = source.instructions
  if (source.parameterLabels?.length) {
    definition.parameters = source.parameterLabels.map((label) => ({ label }))
  }
  return definition
}

/**
 * Builds a stable, collision-free import-local ref from a lens title.
 * Refs identify definitions inside one document only — they are never
 * database identifiers.
 */
function buildLensRef(seed: string, taken: ReadonlyMap<string, string>): string {
  const base =
    seed
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'lens'

  const used = new Set(taken.values())
  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}
