/**
 * Deterministic canvas layout for imported workflows.
 *
 * An imported workflow that opens as a pile of overlapping nodes reads as
 * broken even when it is correct, so layout is part of a successful import
 * rather than a cosmetic afterthought.
 *
 * Nodes are placed by dependency depth: column = longest path from an entry
 * node, row = position among siblings at that depth. Same document in, same
 * coordinates out — no randomness, no timestamps.
 *
 * Layout is *not* part of the portable protocol. Coordinates are regenerated
 * on every import rather than round-tripped, so visual state never leaks into
 * the workflow domain model.
 */

/** Horizontal gap between dependency levels, in canvas units. */
export const LAYOUT_COLUMN_WIDTH = 260

/** Vertical gap between sibling nodes at the same depth. */
export const LAYOUT_ROW_HEIGHT = 140

export interface LayoutNodeInput {
  /** Stable key used by edges — `step-<n>` for imported documents. */
  key: string
}

export interface LayoutEdgeInput {
  sourceKey: string
  targetKey: string
}

export interface LayoutPosition {
  x: number
  y: number
}

/**
 * Assigns a position to every node key.
 *
 * Cycles cannot deadlock the layout: any node not reachable through the
 * topological sweep is appended in input order at the deepest column. The
 * semantic validator rejects real cycles before this runs, so that path only
 * matters for defensive robustness.
 */
export function layoutWorkflowNodes(
  nodes: readonly LayoutNodeInput[],
  edges: readonly LayoutEdgeInput[],
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>()
  if (nodes.length === 0) return positions

  const keys = nodes.map((node) => node.key)
  const known = new Set(keys)
  const inDegree = new Map<string, number>(keys.map((key) => [key, 0]))
  const outgoing = new Map<string, string[]>()

  for (const edge of edges) {
    if (!known.has(edge.sourceKey) || !known.has(edge.targetKey)) continue
    if (edge.sourceKey === edge.targetKey) continue
    inDegree.set(edge.targetKey, (inDegree.get(edge.targetKey) ?? 0) + 1)
    const targets = outgoing.get(edge.sourceKey) ?? []
    targets.push(edge.targetKey)
    outgoing.set(edge.sourceKey, targets)
  }

  // Longest-path depth: a node sits one column right of its deepest dependency.
  const depth = new Map<string, number>(keys.map((key) => [key, 0]))
  const queue = keys.filter((key) => (inDegree.get(key) ?? 0) === 0)
  const remaining = new Map(inDegree)
  let cursor = 0

  while (cursor < queue.length) {
    const key = queue[cursor]
    cursor += 1
    if (key === undefined) break
    const currentDepth = depth.get(key) ?? 0
    for (const target of outgoing.get(key) ?? []) {
      depth.set(target, Math.max(depth.get(target) ?? 0, currentDepth + 1))
      const next = (remaining.get(target) ?? 0) - 1
      remaining.set(target, next)
      if (next === 0) queue.push(target)
    }
  }

  // Anything the sweep never reached (only possible with a cycle) goes last.
  const visited = new Set(queue)
  const maxDepth = keys.reduce((max, key) => Math.max(max, depth.get(key) ?? 0), 0)
  for (const key of keys) {
    if (visited.has(key)) continue
    depth.set(key, maxDepth + 1)
  }

  // Group by column, preserving input order within each column.
  const columns = new Map<number, string[]>()
  for (const key of keys) {
    const column = depth.get(key) ?? 0
    const bucket = columns.get(column) ?? []
    bucket.push(key)
    columns.set(column, bucket)
  }

  for (const [column, columnKeys] of columns) {
    // Centre each column vertically so wide fan-outs stay balanced.
    const offset = ((columnKeys.length - 1) * LAYOUT_ROW_HEIGHT) / 2
    columnKeys.forEach((key, row) => {
      positions.set(key, {
        x: column * LAYOUT_COLUMN_WIDTH,
        y: Math.round(row * LAYOUT_ROW_HEIGHT - offset),
      })
    })
  }

  return positions
}
