import { describe, expect, it } from 'vitest'

import {
  createWorkflowCanvasPaste,
  encodeWorkflowCanvasClipboard,
  parseWorkflowCanvasClipboard,
  serializeWorkflowCanvasSelection,
} from './workflow-canvas-clipboard'

import type { WorkflowNodeData } from '../../types'
import type { Edge, Node } from '@xyflow/react'

function node(id: string, x: number, y: number): Node<WorkflowNodeData> {
  return {
    id,
    type: 'workflowNode',
    position: { x, y },
    data: {
      label: id,
      ordinal: 0,
      isPersisted: true,
      lens_id: id === 'n2' ? '__utility_code' : 'lens-1',
      config: id === 'n2' ? { node_type: 'code', nodeType: 'code' } : {},
      onRemove: () => undefined,
      onConfigNode: () => undefined,
    },
  }
}

describe('workflow canvas clipboard', () => {
  const nodes = [node('n1', 100, 200), node('n2', 220, 260), node('n3', 500, 500)]
  const edges: Edge[] = [
    { id: 'e1', source: 'n1', target: 'n2', type: 'workflowEdge', data: { sourceOutputKey: 'output' } },
    { id: 'e2', source: 'n2', target: 'n3', type: 'workflowEdge' },
  ]

  it('serializes selected nodes and internal edges only', () => {
    const payload = serializeWorkflowCanvasSelection(nodes, edges, { nodeIds: ['n1', 'n2'], edgeIds: ['e2'] })

    expect(payload?.nodes.map((entry) => entry.id)).toEqual(['n1', 'n2'])
    expect(payload?.edges.map((entry) => entry.id)).toEqual(['e1'])
    expect(payload?.nodes[0]?.data.onRemove).toBeUndefined()
  })

  it('defensively parses invalid clipboard payloads', () => {
    expect(parseWorkflowCanvasClipboard('{bad json')).toBeNull()
    expect(parseWorkflowCanvasClipboard(JSON.stringify({ version: 1, nodes: [] }))).toBeNull()
  })

  it('remaps pasted node ids and reconnects internal edges', () => {
    const payload = serializeWorkflowCanvasSelection(nodes, edges, { nodeIds: ['n1', 'n2'], edgeIds: [] })
    expect(payload).not.toBeNull()
    const parsed = parseWorkflowCanvasClipboard(encodeWorkflowCanvasClipboard(payload!))
    expect(parsed).not.toBeNull()

    const pasted = createWorkflowCanvasPaste(parsed!, nodes, { origin: { x: 300, y: 400 } })

    expect(pasted.nodes).toHaveLength(2)
    expect(pasted.edges).toHaveLength(1)
    expect(pasted.nodes.map((entry) => entry.id)).not.toContain('n1')
    expect(pasted.edges[0]?.source).toBe(pasted.nodes[0]?.id)
    expect(pasted.edges[0]?.target).toBe(pasted.nodes[1]?.id)
    expect(pasted.nodes[0]?.position).toEqual({ x: 300, y: 400 })
    expect(pasted.selection.nodeIds).toEqual(pasted.nodes.map((entry) => entry.id))
  })
})
