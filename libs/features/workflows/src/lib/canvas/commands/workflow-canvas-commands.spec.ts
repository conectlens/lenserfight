import { describe, expect, it, vi } from 'vitest'

import {
  createWorkflowCanvasCommandRegistry,
  getWorkflowCanvasCommand,
  isWorkflowCanvasCommandEnabled,
  type WorkflowCanvasCommandActions,
  type WorkflowCanvasCommandState,
} from './workflow-canvas-commands'

function actions(): WorkflowCanvasCommandActions {
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
  }
}

const state: WorkflowCanvasCommandState = {
  readOnly: false,
  hasNodes: true,
  hasSelection: true,
  hasSelectedNode: true,
  hasSingleSelectedNode: true,
  hasSelectedEdge: false,
  canPaste: false,
  canUndo: true,
  canRedo: false,
  canRunNode: false,
}

describe('workflow canvas commands', () => {
  it('reuses the same command handlers across action surfaces', () => {
    const registry = createWorkflowCanvasCommandRegistry(actions(), state)
    const copy = getWorkflowCanvasCommand(registry, 'clipboard.copy')

    expect(copy?.label).toBe('Copy')
    expect(isWorkflowCanvasCommandEnabled(copy!)).toBe(true)
    copy?.run()
    expect(copy?.shortcut?.commandId).toBe('clipboard.copy')
  })

  it('exposes disabled reasons for state-aware commands', () => {
    const registry = createWorkflowCanvasCommandRegistry(actions(), state)
    const paste = getWorkflowCanvasCommand(registry, 'clipboard.paste')
    const edgeMode = getWorkflowCanvasCommand(registry, 'edge.changeMode')

    expect(isWorkflowCanvasCommandEnabled(paste!)).toBe(false)
    expect(paste?.disabledReason?.()).toContain('clipboard')
    expect(isWorkflowCanvasCommandEnabled(edgeMode!)).toBe(false)
    expect(edgeMode?.disabledReason?.()).toContain('workflow schema')
  })
})
