/**
 * n8n Export — best-effort mapping from LenserFight workflow to n8n JSON format.
 *
 * Maps each node to the closest n8n equivalent. LenserFight-specific metadata
 * is preserved under a `_lenserfight` extension field.
 */

import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution'

export interface N8nNode {
  id: string
  name: string
  type: string
  position: [number, number]
  parameters: Record<string, unknown>
  _lenserfight?: {
    originalType: string
    config?: Record<string, unknown>
  }
}

export interface N8nConnection {
  node: string
  type: string
  index: number
}

export interface N8nWorkflow {
  name: string
  nodes: N8nNode[]
  connections: Record<string, { main: N8nConnection[][] }>
  meta: {
    instanceId: string
    templateCredsSetupCompleted: boolean
  }
  _lenserfight: {
    version: string
    exportedAt: string
    originalWorkflowId?: string
    unmappedNodes: string[]
  }
}

interface ExportNode {
  id: string
  label: string
  nodeType?: string
  config?: Record<string, unknown>
  ordinal: number
}

interface ExportEdge {
  sourceNodeId: string
  targetNodeId: string
  sourceOutputKey?: string
  targetParamLabel?: string
}

export function exportToN8n(
  workflowTitle: string,
  nodes: ExportNode[],
  edges: ExportEdge[],
  workflowId?: string,
): N8nWorkflow {
  const unmappedNodes: string[] = []

  const n8nNodes: N8nNode[] = nodes.map((node, i) => {
    const catalogEntry = node.nodeType ? getWorkflowNodeCatalogEntry(node.nodeType) : undefined
    const n8nType = catalogEntry?.n8nEquivalent ?? 'n8n-nodes-base.noOp'

    if (!catalogEntry?.n8nEquivalent) {
      unmappedNodes.push(node.nodeType ?? 'lens')
    }

    return {
      id: node.id,
      name: node.label,
      type: n8nType,
      position: [280 * (node.ordinal ?? i), 200],
      parameters: node.config ?? {},
      _lenserfight: {
        originalType: node.nodeType ?? 'lens',
        config: node.config,
      },
    }
  })

  // Build connections map (n8n format: source → targets)
  const connections: Record<string, { main: N8nConnection[][] }> = {}
  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId)
    if (!sourceNode) continue

    if (!connections[sourceNode.label]) {
      connections[sourceNode.label] = { main: [[]] }
    }

    const targetNode = nodes.find((n) => n.id === edge.targetNodeId)
    if (!targetNode) continue

    connections[sourceNode.label].main[0].push({
      node: targetNode.label,
      type: 'main',
      index: 0,
    })
  }

  return {
    name: workflowTitle,
    nodes: n8nNodes,
    connections,
    meta: {
      instanceId: 'lenserfight-export',
      templateCredsSetupCompleted: false,
    },
    _lenserfight: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      originalWorkflowId: workflowId,
      unmappedNodes: [...new Set(unmappedNodes)],
    },
  }
}
