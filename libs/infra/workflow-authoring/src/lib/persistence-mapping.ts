/**
 * Boundary mapping: protocol document -> workflow persistence inputs.
 *
 * Pure functions only. Nothing here talks to a repository, so the whole
 * mapping is testable without a database and the orchestrator stays the only
 * thing that knows about transactions.
 *
 * Two conventions from the existing schema are honoured here:
 *
 *   1. Node configuration lives in `config.param_overrides` as **strings**.
 *      Descriptor-managed fields are written with a `__` prefix, which
 *      `normalizeWorkflowNodeConfigForExecution` strips before handing them to
 *      a runner. Lens parameter values are stored unprefixed, keyed by label.
 *   2. Edges address nodes by database id, which does not exist until nodes
 *      are inserted. Edge building is therefore a separate second phase.
 */
import { parseConnectionEndpoint, type WorkflowDocument } from '@lenserfight/domain/workflow-protocol'

import { layoutWorkflowNodes } from './canvas-layout'
import { catalogConfigKeys, isLensCatalogEntry } from './node-resolution'
import type { ResolvedStep } from './semantic-validation'

import type { UpsertEdgeInput, UpsertNodeInput } from '@lenserfight/data/repositories'

/** Prefix used for descriptor-managed keys in `param_overrides`. */
const RUNNER_CONFIG_PREFIX = '__'

/**
 * Serialises a protocol parameter value for storage.
 *
 * `param_overrides` is a string map, so structured values are stored as JSON
 * text — the same representation the config forms produce for schema-builder
 * and key-value fields.
 */
export function serializeParameterValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export interface BuildNodeInputsOptions {
  /**
   * Lens record id per step number, for lens steps. Supplied by the
   * orchestrator once lenses have been resolved or created.
   */
  lensIdByStep: ReadonlyMap<number, string>
}

export interface NodeInputPlan {
  /** Insert order; index matches the returned node records. */
  inputs: UpsertNodeInput[]
  /** `step-<n>` key for each entry in `inputs`, positionally aligned. */
  nodeKeys: string[]
}

/**
 * Builds node upsert inputs in dependency order with a generated layout.
 */
export function buildWorkflowNodeInputs(
  document: WorkflowDocument,
  resolvedSteps: readonly ResolvedStep[],
  options: BuildNodeInputsOptions,
): NodeInputPlan {
  const positions = layoutWorkflowNodes(
    resolvedSteps.map((resolved) => ({ key: resolved.nodeKey })),
    document.connections.flatMap((connection) => {
      const from = parseConnectionEndpoint(connection.from)
      const to = parseConnectionEndpoint(connection.to)
      if (!from || !to) return []
      return [{ sourceKey: `step-${from.step}`, targetKey: `step-${to.step}` }]
    }),
  )

  const ordered = [...resolvedSteps].sort((left, right) => left.step.step - right.step.step)

  const inputs: UpsertNodeInput[] = []
  const nodeKeys: string[] = []

  ordered.forEach((resolved, ordinal) => {
    const { step, resolution, nodeKey } = resolved
    const entry = resolution.entry
    const isLens = isLensCatalogEntry(entry)
    const position = positions.get(nodeKey) ?? { x: ordinal * 260, y: 0 }

    inputs.push({
      lens_id: isLens ? (options.lensIdByStep.get(step.step) ?? null) : null,
      version_id: null,
      label: step.name,
      ordinal,
      position_x: position.x,
      position_y: position.y,
      config: buildNodeConfig(resolved),
    })
    nodeKeys.push(nodeKey)
  })

  return { inputs, nodeKeys }
}

/**
 * Builds the `config` JSONB for one node.
 *
 * Lens nodes are the only ones whose parameter keys are author-defined labels;
 * everything else is matched against the catalog's config keys so that a
 * parameter written by label ("Event Type") still lands on the key the runner
 * reads (`__eventType`).
 */
function buildNodeConfig(resolved: ResolvedStep): Record<string, unknown> {
  const { step, resolution } = resolved
  const entry = resolution.entry
  const isLens = isLensCatalogEntry(entry)

  const overrides: Record<string, string> = {}
  const configKeys = catalogConfigKeys(entry)
  const keyByNormalized = new Map(configKeys.map((key) => [normalizeKey(key), key]))

  for (const [rawKey, rawValue] of Object.entries(step.parameters ?? {})) {
    const serialized = serializeParameterValue(rawValue)
    if (serialized === '') continue

    if (isLens) {
      // Lens parameters are addressed by their [[label]], unprefixed.
      overrides[rawKey] = serialized
      continue
    }

    const matched = keyByNormalized.get(normalizeKey(rawKey))
    // An unmatched key is still stored, prefixed, rather than dropped: the
    // catalog's config list is not exhaustive for every node, and silently
    // discarding author intent is worse than carrying an unused key.
    overrides[`${RUNNER_CONFIG_PREFIX}${matched ?? rawKey}`] = serialized
  }

  const config: Record<string, unknown> = {
    node_type: entry.type,
  }
  if (Object.keys(overrides).length > 0) {
    config['param_overrides'] = overrides
  }
  return config
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export interface BuildEdgeInputsOptions {
  /** Database node id per `step-<n>` key, from the node upsert result. */
  nodeIdByKey: ReadonlyMap<string, string>
}

/**
 * Builds edge upsert inputs. Connections whose endpoints did not persist are
 * skipped rather than sent with a dangling id — semantic validation has
 * already rejected genuinely dangling references, so this only guards against
 * a partial node write.
 */
export function buildWorkflowEdgeInputs(
  document: WorkflowDocument,
  options: BuildEdgeInputsOptions,
): UpsertEdgeInput[] {
  const edges: UpsertEdgeInput[] = []

  for (const connection of document.connections) {
    const from = parseConnectionEndpoint(connection.from)
    const to = parseConnectionEndpoint(connection.to)
    if (!from || !to) continue

    const sourceNodeId = options.nodeIdByKey.get(`step-${from.step}`)
    const targetNodeId = options.nodeIdByKey.get(`step-${to.step}`)
    if (!sourceNodeId || !targetNodeId) continue

    edges.push({
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      source_output_key: from.field,
      target_param_label: to.field,
    })
  }

  return edges
}
