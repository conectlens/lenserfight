/**
 * DAG traversal utilities for workflow execution timeline ordering.
 *
 * Uses Kahn's BFS algorithm so the timeline always begins from trigger nodes
 * (zero in-degree) and follows the actual execution graph, not insertion order.
 *
 * Ordering guarantees:
 *   1. Trigger / root nodes (no incoming edges) appear first.
 *   2. Within each BFS wave, nodes are stable-sorted by their ordinal.
 *   3. Disconnected or cycle-adjacent nodes are appended at the end, sorted by ordinal.
 *
 * These guarantees make parallel-branch ordering deterministic and backward-
 * compatible with existing execution payloads regardless of edge-schema changes.
 */
import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'

/**
 * Returns workflow nodes sorted by DAG execution order.
 * Falls back to ordinal sort if there are no edges (linear / empty graph).
 */
export function computeDagOrder(
  nodes: WorkflowNodeRecord[],
  edges: WorkflowEdgeRecord[],
): WorkflowNodeRecord[] {
  if (nodes.length === 0) return []
  if (edges.length === 0) return nodes.slice().sort((a, b) => a.ordinal - b.ordinal)

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // In-degree and adjacency — only include edges where both endpoints are known.
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

  for (const edge of edges) {
    if (!nodeMap.has(edge.source_node_id) || !nodeMap.has(edge.target_node_id)) continue
    inDegree.set(edge.target_node_id, (inDegree.get(edge.target_node_id) ?? 0) + 1)
    adjacency.get(edge.source_node_id)!.push(edge.target_node_id)
  }

  const result: WorkflowNodeRecord[] = []
  const visited = new Set<string>()

  // Seed with root nodes (in-degree 0), stable by ordinal so trigger ordering is consistent.
  let wave = nodes
    .filter((n) => inDegree.get(n.id) === 0)
    .sort((a, b) => a.ordinal - b.ordinal)

  while (wave.length > 0) {
    const nextWave: WorkflowNodeRecord[] = []

    for (const node of wave) {
      if (visited.has(node.id)) continue
      visited.add(node.id)
      result.push(node)

      for (const childId of adjacency.get(node.id) ?? []) {
        const remaining = (inDegree.get(childId) ?? 0) - 1
        inDegree.set(childId, remaining)
        if (remaining === 0) {
          const child = nodeMap.get(childId)
          if (child && !visited.has(childId)) nextWave.push(child)
        }
      }
    }

    // Stable sort within each wave — deterministic for parallel branches.
    wave = nextWave.sort((a, b) => a.ordinal - b.ordinal)
  }

  // Append nodes not reached by BFS (disconnected subgraphs, cycles).
  const unreached = nodes
    .filter((n) => !visited.has(n.id))
    .sort((a, b) => a.ordinal - b.ordinal)

  return result.concat(unreached)
}
