import type { WorkflowNodeData } from '../../types'
import type { WorkflowCanvasSelection } from '../selection/workflow-canvas-selection'
import { filterGraphBySelection } from '../selection/workflow-canvas-selection'
import type { Edge, Node, XYPosition } from '@xyflow/react'

const CLIPBOARD_SCHEMA = 'lenserfight.workflow.canvas'
const CLIPBOARD_VERSION = 1
const PASTE_OFFSET = 32

export interface WorkflowCanvasClipboardNode {
  id: string
  position: XYPosition
  data: Omit<WorkflowNodeData, 'onRemove' | 'onConfigNode' | 'onEditLens'> & Record<string, unknown>
}

export interface WorkflowCanvasClipboardEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  data?: Record<string, unknown>
}

export interface WorkflowCanvasClipboardPayload {
  schema: typeof CLIPBOARD_SCHEMA
  version: typeof CLIPBOARD_VERSION
  copiedAt: string
  nodes: WorkflowCanvasClipboardNode[]
  edges: WorkflowCanvasClipboardEdge[]
}

export interface WorkflowCanvasPasteResult {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
  selection: WorkflowCanvasSelection
}

function cloneJson<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function stripNodeCallbacks(data: WorkflowNodeData): WorkflowCanvasClipboardNode['data'] {
  const { onRemove: _onRemove, onConfigNode: _onConfigNode, onEditLens: _onEditLens, ...serializable } = data
  return cloneJson({
    ...serializable,
    isPersisted: false,
  })
}

export function serializeWorkflowCanvasSelection(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  selection: WorkflowCanvasSelection,
): WorkflowCanvasClipboardPayload | null {
  const { selectedNodes, internalEdges } = filterGraphBySelection(nodes, edges, selection)
  if (selectedNodes.length === 0) return null

  const nodeIds = new Set(selectedNodes.map((node) => node.id))
  return {
    schema: CLIPBOARD_SCHEMA,
    version: CLIPBOARD_VERSION,
    copiedAt: new Date().toISOString(),
    nodes: selectedNodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: stripNodeCallbacks(node.data),
    })),
    edges: internalEdges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: cloneJson((edge.data ?? {}) as Record<string, unknown>),
      })),
  }
}

export function encodeWorkflowCanvasClipboard(payload: WorkflowCanvasClipboardPayload): string {
  return JSON.stringify(payload)
}

export function parseWorkflowCanvasClipboard(raw: string): WorkflowCanvasClipboardPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkflowCanvasClipboardPayload>
    if (parsed.schema !== CLIPBOARD_SCHEMA || parsed.version !== CLIPBOARD_VERSION) return null
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    if (parsed.nodes.some((node) => !node.id || !node.position || !node.data)) return null
    return parsed as WorkflowCanvasClipboardPayload
  } catch {
    return null
  }
}

export function createWorkflowCanvasPaste(
  payload: WorkflowCanvasClipboardPayload,
  existingNodes: Node[],
  options: {
    origin?: XYPosition
    offsetIndex?: number
    hydrateNodeData?: (data: WorkflowCanvasClipboardNode['data']) => WorkflowNodeData
    hydrateEdgeData?: (data: Record<string, unknown> | undefined) => Record<string, unknown>
  } = {},
): WorkflowCanvasPasteResult {
  const existingNodeIds = new Set(existingNodes.map((node) => node.id))
  const idMap = new Map<string, string>()
  const stamp = Date.now()
  const offset = PASTE_OFFSET * Math.max(1, options.offsetIndex ?? 1)
  const minX = Math.min(...payload.nodes.map((node) => node.position.x))
  const minY = Math.min(...payload.nodes.map((node) => node.position.y))
  const origin = options.origin ?? { x: minX + offset, y: minY + offset }

  const nextNodes: Node<WorkflowNodeData>[] = payload.nodes.map((node, index) => {
    let nextId = `tmp-${stamp}-${index}`
    let collisionIndex = 0
    while (existingNodeIds.has(nextId)) {
      collisionIndex += 1
      nextId = `tmp-${stamp}-${index}-${collisionIndex}`
    }
    idMap.set(node.id, nextId)
    existingNodeIds.add(nextId)
    const data = options.hydrateNodeData
      ? options.hydrateNodeData(node.data)
      : ({ ...node.data, isPersisted: false } as WorkflowNodeData)
    return {
      id: nextId,
      type: 'workflowNode',
      position: {
        x: origin.x + (node.position.x - minX),
        y: origin.y + (node.position.y - minY),
      },
      selected: true,
      data,
    }
  })

  const nextEdges: Edge[] = payload.edges
    .map((edge, index) => {
      const source = idMap.get(edge.source)
      const target = idMap.get(edge.target)
      if (!source || !target) return null
      return {
        id: `tmp-edge-${stamp}-${index}`,
        source,
        target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'workflowEdge',
        selected: true,
        data: options.hydrateEdgeData ? options.hydrateEdgeData(edge.data) : edge.data,
      } satisfies Edge
    })
    .filter((edge): edge is Edge => edge !== null)

  return {
    nodes: nextNodes,
    edges: nextEdges,
    selection: {
      nodeIds: nextNodes.map((node) => node.id),
      edgeIds: nextEdges.map((edge) => edge.id),
    },
  }
}
