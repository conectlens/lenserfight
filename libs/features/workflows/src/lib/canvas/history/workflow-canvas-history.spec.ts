import { describe, expect, it } from 'vitest'

import {
  createWorkflowCanvasHistory,
  pushWorkflowCanvasHistory,
  redoWorkflowCanvasHistory,
  undoWorkflowCanvasHistory,
} from './workflow-canvas-history'

import type { Edge, Node } from '@xyflow/react'

const start = {
  nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'workflowNode' }] as Node[],
  edges: [] as Edge[],
  selection: { nodeIds: ['n1'], edgeIds: [] },
}

const moved = {
  nodes: [{ id: 'n1', position: { x: 24, y: 0 }, data: {}, type: 'workflowNode' }] as Node[],
  edges: [] as Edge[],
  selection: { nodeIds: ['n1'], edgeIds: [] },
}

describe('workflow canvas history', () => {
  it('ignores no-op entries', () => {
    const history = pushWorkflowCanvasHistory(createWorkflowCanvasHistory(), {
      label: 'No-op',
      before: start,
      after: start,
    })

    expect(history.past).toHaveLength(0)
  })

  it('undoes and redoes graph snapshots', () => {
    const history = pushWorkflowCanvasHistory(createWorkflowCanvasHistory(), {
      label: 'Move node',
      before: start,
      after: moved,
    })

    const undone = undoWorkflowCanvasHistory(history)
    expect(undone.snapshot).toEqual(start)
    expect(undone.state.future).toHaveLength(1)

    const redone = redoWorkflowCanvasHistory(undone.state)
    expect(redone.snapshot).toEqual(moved)
    expect(redone.state.past).toHaveLength(1)
  })
})
