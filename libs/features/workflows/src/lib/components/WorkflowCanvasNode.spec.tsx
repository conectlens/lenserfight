import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

// ReactFlow must be stubbed — it relies on browser canvas APIs not available in jsdom
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: { type: string; position: string }) =>
    React.createElement('div', { 'data-handle-type': type, 'data-handle-position': position }),
  Position: { Left: 'left', Right: 'right' },
}))

vi.mock('@lenserfight/infra/execution', () => ({
  getWorkflowNodeCatalogEntry: () => null,
}))

vi.mock('../canvas/components/WorkflowNodeQuickActions', () => ({
  WorkflowNodeQuickActions: () => null,
}))

import { WorkflowCanvasNode } from './WorkflowCanvasNode'

import type { WorkflowNodeData } from './WorkflowCanvasNode'

function makeNodeProps(data: Partial<WorkflowNodeData> = {}) {
  const nodeData: WorkflowNodeData = {
    label: 'Test node',
    ordinal: 0,
    isPersisted: true,
    lens_id: 'lens-1',
    lensVisibility: 'public',
    isLensOwner: false,
    onRemove: vi.fn(),
    onDuplicate: vi.fn(),
    onConfigNode: vi.fn(),
    onEditLens: vi.fn(),
    config: null,
    executionStatus: null,
    executionWarning: null,
    ...data,
  }
  return {
    id: 'node-1',
    data: nodeData as unknown as Record<string, unknown>,
    selected: false,
    // Minimal NodeProps shape — only what WorkflowCanvasNode reads
    type: 'workflowNode',
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as never
}

describe('WorkflowCanvasNode', () => {
  it('renders without ring classes when executionStatus is null', () => {
    const { container } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: null })} />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).not.toContain('ring-2')
    expect(outer.className).not.toContain('ring-status-')
    expect(outer.className).not.toContain('ring-primary-yellow')
  })

  it('applies yellow ring for running status', () => {
    const { container } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: 'running' })} />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('ring-primary-yellow-500')
  })

  it('applies green ring for completed status', () => {
    const { container } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: 'completed' })} />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('ring-status-green')
  })

  it('applies red ring for failed status', () => {
    const { container } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: 'failed' })} />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('ring-status-red')
  })

  it('renders execution badge for non-pending, non-null status', () => {
    const { getByRole } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: 'completed' })} />)
    expect(getByRole('status')).toBeDefined()
  })

  it('does not render execution badge for null status', () => {
    const { queryByRole } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: null })} />)
    expect(queryByRole('status')).toBeNull()
  })

  it('does not render execution badge for pending status', () => {
    const { queryByRole } = render(<WorkflowCanvasNode {...makeNodeProps({ executionStatus: 'pending' })} />)
    expect(queryByRole('status')).toBeNull()
  })

  it('renders dry-run warning chip when executionWarning is set', () => {
    const { getByTitle } = render(
      <WorkflowCanvasNode
        {...makeNodeProps({
          executionStatus: 'completed',
          executionWarning: 'email_send skipped (dry run)',
        })}
      />,
    )
    const chip = getByTitle('email_send skipped (dry run)')
    expect(chip).toBeDefined()
  })

  it('does not render warning chip when executionWarning is null', () => {
    const { queryByText } = render(
      <WorkflowCanvasNode {...makeNodeProps({ executionStatus: 'completed', executionWarning: null })} />,
    )
    expect(queryByText('dry run')).toBeNull()
  })

  it('selected state clears the execution ring', () => {
    const props = { ...makeNodeProps({ executionStatus: 'running' }), selected: true }
    const { container } = render(<WorkflowCanvasNode {...props} />)
    const outer = container.firstChild as HTMLElement
    // Selected state uses primary-yellow selection ring, not execution ring
    expect(outer.className).toContain('ring-primary-yellow-500/30')
    // The execution ring (ring-primary-yellow-500/70) is suppressed when selected
    expect(outer.className).not.toContain('ring-primary-yellow-500/70')
  })
})
