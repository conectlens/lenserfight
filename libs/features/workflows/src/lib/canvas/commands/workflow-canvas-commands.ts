import type { WorkflowCanvasShortcut } from '../keyboard/workflow-canvas-shortcuts'

export type WorkflowCanvasCommandScope =
  | 'workflow'
  | 'selection'
  | 'clipboard'
  | 'history'
  | 'viewport'
  | 'layout'
  | 'node'
  | 'edge'
  | 'canvas'

export interface WorkflowCanvasCommand {
  id: string
  label: string
  scope: WorkflowCanvasCommandScope
  shortcut?: WorkflowCanvasShortcut
  destructive?: boolean
  run: () => void | Promise<void>
  isAvailable?: () => boolean
  disabledReason?: () => string | null
}

export interface WorkflowCanvasCommandActions {
  selectAll: () => void
  clearSelection: () => void
  deleteSelection: () => void
  copy: () => void | Promise<void>
  cut: () => void | Promise<void>
  paste: () => void | Promise<void>
  duplicate: () => void | Promise<void>
  undo: () => void
  redo: () => void
  save: () => void
  openCommandPalette: () => void
  openShortcutHelp: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  fitView: () => void
  autoLayout: () => void
  configureNode: () => void
  renameNode: () => void
  toggleNodeDisabled: () => void
  viewNodeDocs: () => void
  addConnectedNode: () => void
  runNode: () => void
  deleteEdge: () => void
  inspectEdgeCompatibility: () => void
  viewEdgeContract: () => void
  addNode: () => void
  createNote: () => void
  createGroup: () => void
  changeEdgeMode: () => void
}

export interface WorkflowCanvasCommandState {
  readOnly: boolean
  hasNodes: boolean
  hasSelection: boolean
  hasSelectedNode: boolean
  hasSingleSelectedNode: boolean
  hasSelectedEdge: boolean
  canPaste: boolean
  canUndo: boolean
  canRedo: boolean
  canRunNode: boolean
}

export function createWorkflowCanvasCommandRegistry(
  actions: WorkflowCanvasCommandActions,
  state: WorkflowCanvasCommandState,
): WorkflowCanvasCommand[] {
  const notReadOnly = () => !state.readOnly
  const hasSelection = () => state.hasSelection && !state.readOnly
  const hasSelectedNode = () => state.hasSelectedNode && !state.readOnly
  const hasSingleSelectedNode = () => state.hasSingleSelectedNode && !state.readOnly
  const hasSelectedEdge = () => state.hasSelectedEdge && !state.readOnly

  return [
    { id: 'selection.selectAll', label: 'Select all', scope: 'selection', shortcut: { key: 'a', meta: true, commandId: 'selection.selectAll' }, run: actions.selectAll, isAvailable: () => state.hasNodes },
    { id: 'selection.clear', label: 'Clear selection', scope: 'selection', shortcut: { key: 'Escape', commandId: 'selection.clear' }, run: actions.clearSelection, isAvailable: () => state.hasSelection },
    { id: 'graph.deleteSelection', label: 'Delete selected', scope: 'selection', shortcut: { key: 'Delete', commandId: 'graph.deleteSelection' }, run: actions.deleteSelection, isAvailable: hasSelection, destructive: true },
    { id: 'graph.deleteSelection.backspace', label: 'Delete selected', scope: 'selection', shortcut: { key: 'Backspace', commandId: 'graph.deleteSelection' }, run: actions.deleteSelection, isAvailable: hasSelection, destructive: true },
    { id: 'clipboard.copy', label: 'Copy', scope: 'clipboard', shortcut: { key: 'c', meta: true, commandId: 'clipboard.copy' }, run: actions.copy, isAvailable: () => state.hasSelection },
    { id: 'clipboard.cut', label: 'Cut', scope: 'clipboard', shortcut: { key: 'x', meta: true, commandId: 'clipboard.cut' }, run: actions.cut, isAvailable: hasSelection },
    { id: 'clipboard.paste', label: 'Paste', scope: 'clipboard', shortcut: { key: 'v', meta: true, commandId: 'clipboard.paste' }, run: actions.paste, isAvailable: () => !state.readOnly && state.canPaste, disabledReason: () => state.canPaste ? null : 'Workflow clipboard is empty' },
    { id: 'clipboard.duplicate', label: 'Duplicate', scope: 'clipboard', shortcut: { key: 'd', meta: true, commandId: 'clipboard.duplicate' }, run: actions.duplicate, isAvailable: hasSelection },
    { id: 'history.undo', label: 'Undo', scope: 'history', shortcut: { key: 'z', meta: true, commandId: 'history.undo' }, run: actions.undo, isAvailable: () => state.canUndo },
    { id: 'history.redo.shift', label: 'Redo', scope: 'history', shortcut: { key: 'z', meta: true, shift: true, commandId: 'history.redo' }, run: actions.redo, isAvailable: () => state.canRedo },
    { id: 'history.redo', label: 'Redo', scope: 'history', shortcut: { key: 'y', meta: true, commandId: 'history.redo' }, run: actions.redo, isAvailable: () => state.canRedo },
    { id: 'workflow.save', label: 'Save workflow', scope: 'workflow', shortcut: { key: 's', meta: true, commandId: 'workflow.save' }, run: actions.save, isAvailable: notReadOnly },
    { id: 'commandPalette.open', label: 'Open command palette', scope: 'canvas', shortcut: { key: 'k', meta: true, commandId: 'commandPalette.open' }, run: actions.openCommandPalette },
    { id: 'help.shortcuts', label: 'Keyboard shortcuts', scope: 'canvas', run: actions.openShortcutHelp },
    { id: 'viewport.zoomIn', label: 'Zoom in', scope: 'viewport', shortcut: { key: '+', commandId: 'viewport.zoomIn' }, run: actions.zoomIn },
    { id: 'viewport.zoomOut', label: 'Zoom out', scope: 'viewport', shortcut: { key: '-', commandId: 'viewport.zoomOut' }, run: actions.zoomOut },
    { id: 'viewport.resetZoom', label: 'Reset zoom', scope: 'viewport', shortcut: { key: '0', commandId: 'viewport.resetZoom' }, run: actions.resetZoom },
    { id: 'viewport.fitView', label: 'Fit view', scope: 'viewport', shortcut: { key: 'f', meta: true, shift: true, commandId: 'viewport.fitView' }, run: actions.fitView },
    { id: 'layout.autoLayout', label: 'Auto-layout', scope: 'layout', run: actions.autoLayout, isAvailable: notReadOnly },
    { id: 'node.configure', label: 'Configure node', scope: 'node', run: actions.configureNode, isAvailable: hasSingleSelectedNode },
    { id: 'node.rename', label: 'Rename node', scope: 'node', run: actions.renameNode, isAvailable: hasSingleSelectedNode },
    { id: 'node.toggleDisabled', label: 'Disable / enable node', scope: 'node', run: actions.toggleNodeDisabled, isAvailable: hasSelectedNode },
    { id: 'node.viewDocs', label: 'View docs', scope: 'node', run: actions.viewNodeDocs, isAvailable: () => state.hasSelectedNode },
    { id: 'node.addConnected', label: 'Add connected node', scope: 'node', run: actions.addConnectedNode, isAvailable: hasSingleSelectedNode },
    { id: 'node.run', label: 'Test / run node', scope: 'node', run: actions.runNode, isAvailable: () => state.canRunNode && !state.readOnly, disabledReason: () => 'Node test execution is available only for supported configured nodes' },
    { id: 'edge.delete', label: 'Delete edge', scope: 'edge', run: actions.deleteEdge, isAvailable: hasSelectedEdge, destructive: true },
    { id: 'edge.inspectCompatibility', label: 'Inspect compatibility', scope: 'edge', run: actions.inspectEdgeCompatibility, isAvailable: () => state.hasSelectedEdge },
    { id: 'edge.viewContract', label: 'View input/output contract', scope: 'edge', run: actions.viewEdgeContract, isAvailable: () => state.hasSelectedEdge },
    { id: 'edge.changeMode', label: 'Change edge mode', scope: 'edge', run: actions.changeEdgeMode, isAvailable: () => false, disabledReason: () => 'Edge modes are not persisted by the workflow schema yet' },
    { id: 'canvas.addNode', label: 'Add node', scope: 'canvas', run: actions.addNode, isAvailable: notReadOnly },
    { id: 'canvas.createNote', label: 'Create note', scope: 'canvas', run: actions.createNote, isAvailable: () => false, disabledReason: () => 'Canvas notes are not part of the workflow schema yet' },
    { id: 'canvas.createGroup', label: 'Create group', scope: 'canvas', run: actions.createGroup, isAvailable: () => false, disabledReason: () => 'Canvas groups are not part of the workflow schema yet' },
  ]
}

export function getWorkflowCanvasCommand(
  commands: WorkflowCanvasCommand[],
  id: string,
): WorkflowCanvasCommand | undefined {
  return commands.find((command) => command.id === id)
}

export function isWorkflowCanvasCommandEnabled(command: WorkflowCanvasCommand): boolean {
  return command.isAvailable ? command.isAvailable() : true
}
