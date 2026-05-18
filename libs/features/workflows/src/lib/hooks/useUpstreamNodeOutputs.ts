/**
 * useUpstreamNodeOutputs — discovers upstream nodes connected to the selected
 * node and returns their output schemas and latest execution values.
 *
 * Responsibilities (GRASP Information Expert):
 *   - Find all edges where target_node_id === selectedNodeId
 *   - Deduplicate by source node (multi-edge same source = one entry)
 *   - Resolve output schema via lens-output-schema-resolver
 *   - Join with nodeResults for live executed values
 *   - Return a stable, safe shape even when data is partial or absent
 */
import { useMemo } from 'react'

import type { WorkflowEdgeRecord, WorkflowNodeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import type { WorkflowNodeSchemaField } from '@lenserfight/infra/execution'
import type { LensOutputContract } from '@lenserfight/types'

import { resolveLensOutputSchema } from '../utils/lens-output-schema-resolver'

export interface UpstreamNodeOutput {
  /** Source node ID */
  nodeId: string
  /** Human-readable label (from record or fallback) */
  label: string
  /** Node type key (e.g. 'manual_trigger', 'code', 'lens') */
  nodeType: string
  /** Latest execution status from nodeResults, null if no run has occurred */
  status: WorkflowNodeResultRecord['status'] | null
  /** Declared output schema — always non-empty */
  outputSchema: WorkflowNodeSchemaField[]
  /**
   * Latest executed output values when status is 'completed'.
   * null when the node has not run, was skipped, or failed.
   */
  executedValues: Record<string, unknown> | null
  /** Error message from the latest run, if any */
  error: string | null
}

interface UseUpstreamNodeOutputsParams {
  /** The currently selected/configured node whose upstream we are inspecting */
  nodeId: string
  edges: WorkflowEdgeRecord[]
  nodes: WorkflowNodeRecord[]
  /** Live node results from the latest run; pass [] when no run is active */
  nodeResults: WorkflowNodeResultRecord[]
  /**
   * Optional map of lensId → LensOutputContract for lens nodes.
   * When provided, allows richer schema inference from the lens version contract.
   */
  lensContracts?: Record<string, LensOutputContract>
}

export function useUpstreamNodeOutputs({
  nodeId,
  edges,
  nodes,
  nodeResults,
  lensContracts,
}: UseUpstreamNodeOutputsParams): UpstreamNodeOutput[] {
  return useMemo(() => {
    // Find all edges targeting the selected node
    const incomingEdges = edges.filter((e) => e.target_node_id === nodeId)
    if (incomingEdges.length === 0) return []

    // Deduplicate source nodes (multiple edges from the same source = one entry)
    const seenSourceIds = new Set<string>()
    const uniqueSourceIds: string[] = []
    for (const edge of incomingEdges) {
      if (!seenSourceIds.has(edge.source_node_id)) {
        seenSourceIds.add(edge.source_node_id)
        uniqueSourceIds.push(edge.source_node_id)
      }
    }

    // Build a results map for O(1) lookup
    const resultsMap = new Map<string, WorkflowNodeResultRecord>()
    for (const result of nodeResults) {
      resultsMap.set(result.node_id, result)
    }

    // Build the output per upstream source node
    return uniqueSourceIds.flatMap((sourceId): UpstreamNodeOutput[] => {
      const node = nodes.find((n) => n.id === sourceId)
      if (!node) return [] // Node deleted from canvas — skip gracefully

      const nodeType = resolveNodeType(node)
      const label = node.label ?? resolveDefaultLabel(nodeType, node.ordinal)
      const result = resultsMap.get(sourceId) ?? null

      // Resolve output schema
      const lensContract = node.lens_id && lensContracts ? lensContracts[node.lens_id] : undefined
      const outputSchema = resolveLensOutputSchema(nodeType, lensContract)

      // Only surface executed values for completed nodes
      const executedValues =
        result?.status === 'completed' && result.output_data
          ? (result.output_data as Record<string, unknown>)
          : null

      const error =
        result && result.status !== 'completed' && result.status !== 'pending' && result.status !== 'queued'
          ? (result.error_message ?? null)
          : null

      return [
        {
          nodeId: sourceId,
          label,
          nodeType,
          status: result?.status ?? null,
          outputSchema,
          executedValues,
          error,
        },
      ]
    })
  }, [nodeId, edges, nodes, nodeResults, lensContracts])
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function resolveNodeType(node: WorkflowNodeRecord): string {
  // Utility nodes store node_type in config; lens nodes have a lens_id
  const config = node.config as Record<string, unknown> | null | undefined
  const configType = (config?.node_type ?? config?.nodeType) as string | undefined
  if (configType) return configType
  if (node.lens_id) return 'lens'
  return 'unknown'
}

function resolveDefaultLabel(nodeType: string, ordinal: number): string {
  // Humanise node_type for display: 'manual_trigger' → 'Manual Trigger'
  const humanised = nodeType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return `${humanised} (${ordinal})`
}
