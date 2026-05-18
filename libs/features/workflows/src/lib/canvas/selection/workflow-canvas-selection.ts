import type { Edge, Node } from '@xyflow/react'

export interface WorkflowCanvasSelection {
  nodeIds: string[]
  edgeIds: string[]
}

export const EMPTY_WORKFLOW_CANVAS_SELECTION: WorkflowCanvasSelection = {
  nodeIds: [],
  edgeIds: [],
}

export function normalizeWorkflowCanvasSelection(selection: WorkflowCanvasSelection): WorkflowCanvasSelection {
  return {
    nodeIds: Array.from(new Set(selection.nodeIds)),
    edgeIds: Array.from(new Set(selection.edgeIds)),
  }
}

export function getSelectionCounts(selection: WorkflowCanvasSelection) {
  return {
    nodes: selection.nodeIds.length,
    edges: selection.edgeIds.length,
    total: selection.nodeIds.length + selection.edgeIds.length,
  }
}

export function hasWorkflowCanvasSelection(selection: WorkflowCanvasSelection): boolean {
  return getSelectionCounts(selection).total > 0
}

export function selectAllWorkflowItems(nodes: Node[], edges: Edge[]): WorkflowCanvasSelection {
  return {
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
  }
}

export function applyWorkflowSelectionToGraph<T>(
  nodes: Node<T>[],
  edges: Edge[],
  selection: WorkflowCanvasSelection,
): { nodes: Node<T>[]; edges: Edge[] } {
  const nodeIds = new Set(selection.nodeIds)
  const edgeIds = new Set(selection.edgeIds)
  return {
    nodes: nodes.map((node) => ({ ...node, selected: nodeIds.has(node.id) })),
    edges: edges.map((edge) => ({ ...edge, selected: edgeIds.has(edge.id) })),
  }
}

export function getWorkflowSelectionFromGraph(nodes: Node[], edges: Edge[]): WorkflowCanvasSelection {
  return normalizeWorkflowCanvasSelection({
    nodeIds: nodes.filter((node) => node.selected).map((node) => node.id),
    edgeIds: edges.filter((edge) => edge.selected).map((edge) => edge.id),
  })
}

export function filterGraphBySelection<T>(
  nodes: Node<T>[],
  edges: Edge[],
  selection: WorkflowCanvasSelection,
): { selectedNodes: Node<T>[]; selectedEdges: Edge[]; internalEdges: Edge[] } {
  const nodeIds = new Set(selection.nodeIds)
  const edgeIds = new Set(selection.edgeIds)
  const selectedNodes = nodes.filter((node) => nodeIds.has(node.id))
  const selectedEdges = edges.filter((edge) => edgeIds.has(edge.id))
  const internalEdges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  return { selectedNodes, selectedEdges, internalEdges }
}
