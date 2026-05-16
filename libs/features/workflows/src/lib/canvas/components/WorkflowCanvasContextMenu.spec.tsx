import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, contextError: _contextError, isLoading: _isLoading, fullWidth: _fullWidth, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    contextError?: string | null
    isLoading?: boolean
    fullWidth?: boolean
  }) => <button {...props}>{children}</button>,
}))

import { createWorkflowCanvasCommandRegistry, type WorkflowCanvasCommandActions } from '../commands/workflow-canvas-commands'
import { WorkflowCanvasContextMenu } from './WorkflowCanvasContextMenu'

function actions(overrides: Partial<WorkflowCanvasCommandActions> = {}): WorkflowCanvasCommandActions {
  return {
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    deleteSelection: vi.fn(),
    copy: vi.fn(),
    cut: vi.fn(),
    paste: vi.fn(),
    duplicate: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(),
    openCommandPalette: vi.fn(),
    openShortcutHelp: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    fitView: vi.fn(),
    autoLayout: vi.fn(),
    configureNode: vi.fn(),
    renameNode: vi.fn(),
    toggleNodeDisabled: vi.fn(),
    viewNodeDocs: vi.fn(),
    addConnectedNode: vi.fn(),
    runNode: vi.fn(),
    deleteEdge: vi.fn(),
    inspectEdgeCompatibility: vi.fn(),
    viewEdgeContract: vi.fn(),
    addNode: vi.fn(),
    createNote: vi.fn(),
    createGroup: vi.fn(),
    changeEdgeMode: vi.fn(),
    ...overrides,
  }
}

describe('WorkflowCanvasContextMenu', () => {
  it('renders canvas actions from the command registry', () => {
    const addNode = vi.fn()
    const commands = createWorkflowCanvasCommandRegistry(actions({ addNode }), {
      readOnly: false,
      hasNodes: true,
      hasSelection: false,
      hasSelectedNode: false,
      hasSingleSelectedNode: false,
      hasSelectedEdge: false,
      canPaste: false,
      canUndo: false,
      canRedo: false,
      canRunNode: false,
    })

    render(<WorkflowCanvasContextMenu x={0} y={0} target="canvas" commands={commands} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Add node'))
    expect(addNode).toHaveBeenCalled()
    expect(screen.getByText('Paste')).toBeTruthy()
  })
})
