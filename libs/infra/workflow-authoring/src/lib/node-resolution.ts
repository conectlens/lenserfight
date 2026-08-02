/**
 * Resolves protocol steps onto real palette nodes.
 *
 * The node catalog is the only authority on which node types exist. A step
 * names a node the way a human would ("Form Input", "Human Approval"); this
 * module turns that into a catalog entry or an actionable error. Nothing here
 * invents node types, and an unresolvable name is always a hard failure —
 * silently substituting a no-op would produce a workflow that looks fine and
 * does the wrong thing.
 */
import {
  WORKFLOW_NODE_CATALOG,
  getWorkflowNodeCatalogEntry,
  type WorkflowNodeCatalogEntry,
  type WorkflowNodeCategory,
} from '@lenserfight/infra/execution'

import type { WorkflowStepKind } from '@lenserfight/domain/workflow-protocol'

/** The catalog type used for steps that execute a LenserFight lens. */
export const LENS_NODE_TYPE = 'lens'

/**
 * Which catalog categories each protocol kind may resolve to.
 *
 * `tool` is deliberately broad: from an author's point of view everything that
 * is neither a trigger nor a lens nor branching logic is "a tool", and forcing
 * models to pick the right internal category would create failures that carry
 * no information.
 */
const KIND_TO_CATEGORIES: Record<WorkflowStepKind, readonly WorkflowNodeCategory[]> = {
  trigger: ['trigger'],
  lens: ['lens'],
  logic: ['logic'],
  tool: [
    'data',
    'ai_primitive',
    'battle',
    'storage',
    'communication',
    'integration',
    'media',
    'utility',
    'logic',
  ],
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Lookup index built once. Later entries never overwrite earlier ones, so a
 * canonical `type` or `displayName` always beats an alias that collides.
 */
const NAME_INDEX: ReadonlyMap<string, WorkflowNodeCatalogEntry> = (() => {
  const index = new Map<string, WorkflowNodeCatalogEntry>()
  const add = (key: string, entry: WorkflowNodeCatalogEntry) => {
    const normalized = normalizeName(key)
    if (normalized && !index.has(normalized)) index.set(normalized, entry)
  }
  // Two passes so that aliases can never shadow a canonical identifier.
  for (const entry of WORKFLOW_NODE_CATALOG) {
    add(entry.type, entry)
    add(entry.displayName, entry)
    add(entry.label, entry)
  }
  for (const entry of WORKFLOW_NODE_CATALOG) {
    for (const alias of entry.aliases) add(alias, entry)
  }
  return index
})()

export interface NodeResolution {
  entry: WorkflowNodeCatalogEntry
  /** True when the match came from `name` rather than an explicit `nodeType`. */
  resolvedByName: boolean
}

export type NodeResolutionOutcome =
  | { ok: true; resolution: NodeResolution }
  | { ok: false; message: string; suggestions: string[] }

export interface ResolveNodeInput {
  kind: WorkflowStepKind
  name: string
  nodeType?: string | undefined
}

/**
 * Resolves one step. `nodeType` wins when present because export always pins
 * it; `name` is the fallback for hand-written and AI-generated documents.
 */
export function resolveWorkflowNode(input: ResolveNodeInput): NodeResolutionOutcome {
  const allowedCategories = KIND_TO_CATEGORIES[input.kind]

  if (input.nodeType) {
    const entry = getWorkflowNodeCatalogEntry(input.nodeType)
    if (!entry) {
      return {
        ok: false,
        message: `Unknown node type "${input.nodeType}". It is not in the workflow palette.`,
        suggestions: suggestNames(input.nodeType, allowedCategories),
      }
    }
    if (!allowedCategories.includes(entry.category)) {
      return {
        ok: false,
        message: `Node "${entry.displayName}" is a ${entry.category} node and cannot be used as a "${input.kind}" step.`,
        suggestions: suggestNames(input.name, allowedCategories),
      }
    }
    return { ok: true, resolution: { entry, resolvedByName: false } }
  }

  const entry = NAME_INDEX.get(normalizeName(input.name))
  if (!entry) {
    return {
      ok: false,
      message: `No palette node matches "${input.name}".`,
      suggestions: suggestNames(input.name, allowedCategories),
    }
  }
  if (!allowedCategories.includes(entry.category)) {
    return {
      ok: false,
      message: `"${input.name}" resolves to a ${entry.category} node, which cannot be used as a "${input.kind}" step.`,
      suggestions: suggestNames(input.name, allowedCategories),
    }
  }

  return { ok: true, resolution: { entry, resolvedByName: true } }
}

/**
 * Cheap similarity ranking for error messages — shared-token overlap, then
 * substring, then alphabetical. Good enough to point at the right node without
 * pulling in an edit-distance dependency.
 */
function suggestNames(
  query: string,
  allowedCategories: readonly WorkflowNodeCategory[],
  limit = 4,
): string[] {
  const queryTokens = new Set(normalizeName(query).split(' ').filter(Boolean))
  const candidates = WORKFLOW_NODE_CATALOG.filter((entry) =>
    allowedCategories.includes(entry.category),
  )

  return candidates
    .map((entry) => {
      const tokens = normalizeName(entry.displayName).split(' ').filter(Boolean)
      const overlap = tokens.filter((token) => queryTokens.has(token)).length
      const substring = normalizeName(entry.displayName).includes(normalizeName(query)) ? 1 : 0
      return { entry, score: overlap * 2 + substring }
    })
    .filter((scored) => scored.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.entry.displayName.localeCompare(right.entry.displayName),
    )
    .slice(0, limit)
    .map((scored) => `${scored.entry.displayName} (${scored.entry.type})`)
}

/** Output keys a resolved node actually publishes, per the catalog. */
export function catalogOutputKeys(entry: WorkflowNodeCatalogEntry): string[] {
  return entry.outputs.map((output) => output.name)
}

/** Config keys a resolved node accepts, required and optional combined. */
export function catalogConfigKeys(entry: WorkflowNodeCatalogEntry): string[] {
  return [
    ...entry.requiredConfig.map((field) => field.key),
    ...entry.optionalConfig.map((field) => field.key),
  ]
}

export function catalogRequiredConfigKeys(entry: WorkflowNodeCatalogEntry): string[] {
  return entry.requiredConfig.filter((field) => field.required !== false).map((field) => field.key)
}

/** True when the entry is the lens node, which binds to a lens record. */
export function isLensCatalogEntry(entry: WorkflowNodeCatalogEntry): boolean {
  return entry.type === LENS_NODE_TYPE
}
