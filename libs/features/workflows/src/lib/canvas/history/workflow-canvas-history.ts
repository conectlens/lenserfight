import type { WorkflowCanvasSelection } from '../selection/workflow-canvas-selection'
import type { Edge, Node } from '@xyflow/react'

export interface WorkflowCanvasGraphSnapshot<T = unknown> {
  nodes: Node<T>[]
  edges: Edge[]
  selection: WorkflowCanvasSelection
}

export interface WorkflowCanvasHistoryEntry<T = unknown> {
  label: string
  before: WorkflowCanvasGraphSnapshot<T>
  after: WorkflowCanvasGraphSnapshot<T>
}

export interface WorkflowCanvasHistoryState<T = unknown> {
  past: WorkflowCanvasHistoryEntry<T>[]
  future: WorkflowCanvasHistoryEntry<T>[]
  limit: number
}

export function createWorkflowCanvasHistory<T>(limit = 100): WorkflowCanvasHistoryState<T> {
  return { past: [], future: [], limit }
}

function snapshotFingerprint<T>(snapshot: WorkflowCanvasGraphSnapshot<T>): string {
  return JSON.stringify({
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: node.data,
      selected: node.selected ?? false,
    })),
    edges: snapshot.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      data: edge.data ?? null,
      selected: edge.selected ?? false,
    })),
    selection: snapshot.selection,
  })
}

export function areWorkflowCanvasSnapshotsEqual<T>(
  a: WorkflowCanvasGraphSnapshot<T>,
  b: WorkflowCanvasGraphSnapshot<T>,
): boolean {
  return snapshotFingerprint(a) === snapshotFingerprint(b)
}

export function pushWorkflowCanvasHistory<T>(
  state: WorkflowCanvasHistoryState<T>,
  entry: WorkflowCanvasHistoryEntry<T>,
): WorkflowCanvasHistoryState<T> {
  if (areWorkflowCanvasSnapshotsEqual(entry.before, entry.after)) return state
  const nextPast = [...state.past, entry].slice(-state.limit)
  return { ...state, past: nextPast, future: [] }
}

export function undoWorkflowCanvasHistory<T>(
  state: WorkflowCanvasHistoryState<T>,
): { state: WorkflowCanvasHistoryState<T>; snapshot: WorkflowCanvasGraphSnapshot<T> | null; label?: string } {
  const entry = state.past[state.past.length - 1]
  if (!entry) return { state, snapshot: null }
  return {
    state: {
      ...state,
      past: state.past.slice(0, -1),
      future: [entry, ...state.future].slice(0, state.limit),
    },
    snapshot: entry.before,
    label: entry.label,
  }
}

export function redoWorkflowCanvasHistory<T>(
  state: WorkflowCanvasHistoryState<T>,
): { state: WorkflowCanvasHistoryState<T>; snapshot: WorkflowCanvasGraphSnapshot<T> | null; label?: string } {
  const entry = state.future[0]
  if (!entry) return { state, snapshot: null }
  return {
    state: {
      ...state,
      past: [...state.past, entry].slice(-state.limit),
      future: state.future.slice(1),
    },
    snapshot: entry.after,
    label: entry.label,
  }
}
