import '@xyflow/react/dist/style.css'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import type {
  Connection,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react'
import type {
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  UpsertNodeInput,
  UpsertEdgeInput,
} from '@lenserfight/data/repositories'
import React, { useCallback, useEffect, useRef } from 'react'

import { useSaveWorkflow } from '../hooks/useSaveWorkflow'
import type { WorkflowNodeData } from './WorkflowCanvasNode'
import { WorkflowCanvasNode } from './WorkflowCanvasNode'
import { WorkflowCanvasEdge } from './WorkflowCanvasEdge'
import type { DraggedLensData } from './WorkflowLensPalette'

// ─── Type registries ──────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = { workflowNode: WorkflowCanvasNode }
const edgeTypes: EdgeTypes = { workflowEdge: WorkflowCanvasEdge }

// ─── Record → Flow node/edge converters ──────────────────────────────────────

function toFlowNode(
  record: WorkflowNodeRecord,
  onRemove: (id: string) => void
): Node<WorkflowNodeData> {
  return {
    id: record.id,
    type: 'workflowNode',
    position: { x: record.position_x, y: record.position_y },
    data: {
      label: record.label ?? 'Lens node',
      ordinal: record.ordinal,
      isPersisted: true,
      lens_id: record.lens_id,
      onRemove,
    } as WorkflowNodeData & { lens_id: string },
  }
}

function toFlowEdge(
  record: WorkflowEdgeRecord,
  onRemove: (id: string) => void
): Edge {
  return {
    id: record.id,
    source: record.source_node_id,
    target: record.target_node_id,
    type: 'workflowEdge',
    data: { sourceOutputKey: record.source_output_key, onRemove },
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WorkflowBuilderCanvasProps {
  workflowId: string
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  readOnly?: boolean
}

// ─── Public component — wraps inner in ReactFlowProvider ─────────────────────

export function WorkflowBuilderCanvas(props: WorkflowBuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

// ─── Inner component — can call useReactFlow ──────────────────────────────────

function WorkflowBuilderCanvasInner({
  workflowId,
  nodes: nodeRecords,
  edges: edgeRecords,
  readOnly = false,
}: WorkflowBuilderCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const { mutateAsync: saveWorkflow } = useSaveWorkflow()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flowNodesRef = useRef<Node<WorkflowNodeData>[]>([])
  const flowEdgesRef = useRef<Edge[]>([])

  // ── Remove handlers ──────────────────────────────────────────────────────
  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    scheduleSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemoveEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    scheduleSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Flow state ────────────────────────────────────────────────────────────
  const [flowNodes, setNodes, onNodesChange] = useNodesState(
    nodeRecords.map((n) => toFlowNode(n, handleRemoveNode))
  )
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(
    edgeRecords.map((e) => toFlowEdge(e, handleRemoveEdge))
  )

  // Re-seed when DB records arrive (initial fetch)
  useEffect(() => {
    setNodes(nodeRecords.map((n) => toFlowNode(n, handleRemoveNode)))
  }, [nodeRecords, handleRemoveNode, setNodes])

  useEffect(() => {
    setEdges(edgeRecords.map((e) => toFlowEdge(e, handleRemoveEdge)))
  }, [edgeRecords, handleRemoveEdge, setEdges])

  // ── Sync refs with latest state ───────────────────────────────────────────
  useEffect(() => { flowNodesRef.current = flowNodes }, [flowNodes])
  useEffect(() => { flowEdgesRef.current = flowEdges }, [flowEdges])

  // ── Cleanup pending save on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  // ── Debounced save ────────────────────────────────────────────────────────
  // NOTE: saveWorkflow is called in the timeout callback body, NOT inside a
  // React state updater. State updaters are double-invoked in StrictMode,
  // which would cause duplicate POST requests. Reading state via refs is safe.
  const scheduleSave = useCallback(() => {
    if (readOnly) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const nds = flowNodesRef.current
      const eds = flowEdgesRef.current
      const upsertNodes: UpsertNodeInput[] = nds.map((n, i) => {
        const d = n.data as WorkflowNodeData & { lens_id?: string }
        return {
          id: n.id.startsWith('tmp-') ? undefined : n.id,
          lens_id: d.lens_id ?? n.id,
          version_id: null,
          label: d.label,
          ordinal: d.ordinal ?? i,
          position_x: n.position.x,
          position_y: n.position.y,
        }
      })
      const upsertEdges: UpsertEdgeInput[] = eds
        .filter((e) => !e.id.startsWith('tmp-edge-'))
        .map((e) => ({
          id: e.id,
          source_node_id: e.source,
          target_node_id: e.target,
          source_output_key:
            (e.data as { sourceOutputKey?: string })?.sourceOutputKey ?? 'output',
          target_param_label: e.targetHandle ?? 'input',
        }))
      saveWorkflow({ workflowId, nodes: upsertNodes, edges: upsertEdges }).catch(() => null)
    }, 1500)
  }, [readOnly, workflowId, saveWorkflow])

  // ── Connect nodes ─────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `tmp-edge-${Date.now()}`,
        type: 'workflowEdge',
        data: { sourceOutputKey: 'output', onRemove: handleRemoveEdge },
      } as Edge
      setEdges((eds) => addEdge(newEdge, eds))
      scheduleSave()
    },
    [setEdges, scheduleSave, handleRemoveEdge]
  )

  // ── Drag-and-drop from palette ────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/lenserfight-lens')
      if (!raw) return
      const lensData: DraggedLensData = JSON.parse(raw)
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const nextOrdinal = flowNodes.length
      const newNode: Node<WorkflowNodeData> = {
        id: `tmp-${Date.now()}`,
        type: 'workflowNode',
        position: pos,
        data: {
          label: lensData.title,
          ordinal: nextOrdinal,
          isPersisted: false,
          lens_id: lensData.lens_id,
          onRemove: handleRemoveNode,
        } as WorkflowNodeData & { lens_id: string },
      }
      setNodes((nds) => [...nds, newNode])
      scheduleSave()
    },
    [screenToFlowPosition, flowNodes.length, setNodes, scheduleSave, handleRemoveNode]
  )

  const onNodeDragStop = useCallback(() => scheduleSave(), [scheduleSave])

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={readOnly ? undefined : onNodesChange}
      onEdgesChange={readOnly ? undefined : onEdgesChange}
      onConnect={readOnly ? undefined : onConnect}
      onDragOver={readOnly ? undefined : onDragOver}
      onDrop={readOnly ? undefined : onDrop}
      onNodeDragStop={readOnly ? undefined : onNodeDragStop}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable={!readOnly}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.2}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="var(--cl-greyscale-200, #e5e7eb)"
        style={{ opacity: 0.5 }}
      />
      <Controls
        position="bottom-left"
        showInteractive={false}
      />
      <MiniMap
        position="bottom-right"
        nodeColor="var(--cl-surface-raised, #f3f4f6)"
        maskColor="rgba(0,0,0,0.05)"
        className="!rounded-2xl !border !border-surface-border !overflow-hidden"
      />
    </ReactFlow>
  )
}
