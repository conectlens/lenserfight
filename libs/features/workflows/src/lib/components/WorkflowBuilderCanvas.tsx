import '@xyflow/react/dist/style.css'
import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useQueryClient } from '@tanstack/react-query'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import React, { useCallback, useEffect, useRef } from 'react'

import { useSaveWorkflow } from '../hooks/useSaveWorkflow'

import { WorkflowCanvasEdge } from './WorkflowCanvasEdge'
import { WorkflowCanvasNode } from './WorkflowCanvasNode'

import type { WorkflowNodeData, WorkflowNodeConfig } from './WorkflowCanvasNode'
import type { DraggedLensData } from './WorkflowLensPalette'
import type {
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  UpsertNodeInput,
  UpsertEdgeInput,
} from '@lenserfight/data/repositories'
import type {
  Connection,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react'

// ─── Type registries ──────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = { workflowNode: WorkflowCanvasNode }
const edgeTypes: EdgeTypes = { workflowEdge: WorkflowCanvasEdge }

// ─── Record → Flow node/edge converters ──────────────────────────────────────

function toFlowNode(
  record: WorkflowNodeRecord,
  onRemove: (id: string) => void,
  onConfigNode?: (nodeId: string, lensId: string) => void,
  onEditLens?: (lensId: string) => void,
  currentUserId?: string,
  nodeConfigOverrides?: Record<string, WorkflowNodeConfig>,
): Node<WorkflowNodeData> {
  const isLensOwner = !!currentUserId && !!record.lens_lenser_id && currentUserId === record.lens_lenser_id
  return {
    id: record.id,
    type: 'workflowNode',
    position: { x: record.position_x, y: record.position_y },
    data: {
      label: record.label ?? 'Lens node',
      ordinal: record.ordinal,
      isPersisted: true,
      lens_id: record.lens_id,
      lensVisibility: record.lens_visibility as 'public' | 'private' | 'unlisted' | undefined,
      lensLenserId: record.lens_lenser_id ?? undefined,
      isLensOwner,
      config: nodeConfigOverrides?.[record.id] ?? record.config ?? {},
      onRemove,
      onConfigNode,
      onEditLens: isLensOwner ? onEditLens : undefined,
    } as WorkflowNodeData & { lens_id: string },
  }
}

// ─── Tree layout helper ───────────────────────────────────────────────────────

function computeTreeLayout<T extends Record<string, unknown>>(nodes: Node<T>[], edges: Edge[]): Node<T>[] {
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()
  nodes.forEach((n) => { inDegree.set(n.id, 0); adjList.set(n.id, []) })
  edges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    adjList.get(e.source)?.push(e.target)
  })
  const levels = new Map<string, number>()
  const queue: string[] = []
  nodes.forEach((n) => { if ((inDegree.get(n.id) ?? 0) === 0) queue.push(n.id) })
  queue.forEach((id) => levels.set(id, 0))
  let qi = 0
  while (qi < queue.length) {
    const id = queue[qi++]
    for (const child of adjList.get(id) ?? []) {
      const newLevel = (levels.get(id) ?? 0) + 1
      if (!levels.has(child) || levels.get(child)! < newLevel) {
        levels.set(child, newLevel)
        queue.push(child)
      }
    }
  }
  const levelCounts = new Map<number, number>()
  return nodes.map((n) => {
    const level = levels.get(n.id) ?? 0
    const pos = levelCounts.get(level) ?? 0
    levelCounts.set(level, pos + 1)
    return { ...n, position: { x: level * 280, y: pos * 130 } }
  })
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
  currentUserId?: string
  nodeConfigOverrides?: Record<string, WorkflowNodeConfig>
  onConfigNode?: (nodeId: string, lensId: string) => void
  onEditLens?: (lensId: string) => void
  onEdit?: () => void
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
  currentUserId,
  nodeConfigOverrides,
  onConfigNode,
  onEditLens,
  onEdit,
}: WorkflowBuilderCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const { mutateAsync: saveWorkflow } = useSaveWorkflow()
  const queryClient = useQueryClient()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flowNodesRef = useRef<Node<WorkflowNodeData>[]>([])
  const flowEdgesRef = useRef<Edge[]>([])

  // ── Remove handlers ──────────────────────────────────────────────────────
  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    // Delete persisted nodes from DB immediately; temp nodes only need state removal
    if (!nodeId.startsWith('tmp-')) {
      workflowsService.deleteNode(nodeId).catch(() => null)
      queryClient.setQueryData(
        queryKeys.workflows.nodes(workflowId),
        (old: WorkflowNodeRecord[] | undefined) => (old ?? []).filter((n) => n.id !== nodeId)
      )
    }
    scheduleSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, queryClient])

  const handleRemoveEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    if (!edgeId.startsWith('tmp-edge-')) {
      workflowsService.deleteEdge(edgeId).catch(() => null)
      queryClient.setQueryData(
        queryKeys.workflows.edges(workflowId),
        (old: WorkflowEdgeRecord[] | undefined) => (old ?? []).filter((e) => e.id !== edgeId)
      )
    }
    scheduleSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, queryClient])

  // ── Flow state ────────────────────────────────────────────────────────────
  const [flowNodes, setNodes, onNodesChange] = useNodesState(
    nodeRecords.map((n) => toFlowNode(n, handleRemoveNode, onConfigNode, onEditLens, currentUserId, nodeConfigOverrides))
  )
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(
    edgeRecords.map((e) => toFlowEdge(e, handleRemoveEdge))
  )

  // Re-seed when DB records arrive (initial fetch)
  useEffect(() => {
    setNodes(nodeRecords.map((n) => toFlowNode(n, handleRemoveNode, onConfigNode, onEditLens, currentUserId, nodeConfigOverrides)))
  }, [nodeRecords, handleRemoveNode, onConfigNode, onEditLens, currentUserId, nodeConfigOverrides, setNodes])

  // Sync config overrides into existing nodes without re-seeding positions
  useEffect(() => {
    if (!nodeConfigOverrides) return
    setNodes((nds) => nds.map((n) => {
      const override = nodeConfigOverrides[n.id]
      if (!override) return n
      return { ...n, data: { ...n.data, config: override } }
    }))
  }, [nodeConfigOverrides, setNodes])

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
      // Auto-layout: apply tree layout after connecting
      setNodes((nds) => computeTreeLayout(nds, [...flowEdgesRef.current, newEdge]))
      scheduleSave()
    },
    [setEdges, setNodes, scheduleSave, handleRemoveEdge]
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
          lensVisibility: lensData.visibility,
          lensLenserId: lensData.lenser_id,
          isLensOwner: !!currentUserId && currentUserId === lensData.lenser_id,
          config: {},
          onRemove: handleRemoveNode,
          onConfigNode,
          onEditLens: (!!currentUserId && currentUserId === lensData.lenser_id) ? onEditLens : undefined,
        } as WorkflowNodeData & { lens_id: string },
      }
      setNodes((nds) => [...nds, newNode])
      scheduleSave()
    },
    [screenToFlowPosition, flowNodes.length, setNodes, scheduleSave, handleRemoveNode, onConfigNode, onEditLens, currentUserId]
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
      elementsSelectable={true}
      defaultEdgeOptions={{ type: 'workflowEdge' }}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.2}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      connectionLineStyle={{ 
        stroke: 'var(--cl-workflow-edge)',
        strokeWidth: 2 
      }}
      className="[--xy-edge-stroke:var(--cl-workflow-edge)] [--xy-edge-stroke-selected:var(--cl-yellow-700)] dark:[--xy-edge-stroke-selected:var(--cl-yellow-500)]"
    >
      {onEdit && !readOnly && (
        <Panel position="top-left">
          <button
            onClick={onEdit}
            title="Edit workflow settings"
            className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-base px-2.5 py-1.5 text-xs font-medium text-greyscale-500 shadow-sm transition-colors hover:text-greyscale-900 hover:bg-surface-raised dark:hover:text-greyscale-100"
          >
            <Pencil size={12} />
            Edit
          </button>
        </Panel>
      )}
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="var(--cl-grey-300)"
        style={{ opacity: 0.6 }}
      />
      <Controls
        position="bottom-left"
        showInteractive={false}
      />
      <MiniMap
        position="bottom-right"
        nodeColor="var(--cl-surface-raised)"
        maskColor="color-mix(in srgb, black 8%, transparent)"
        className="!rounded-2xl !border !border-surface-border !overflow-hidden"
      />
    </ReactFlow>
  )
}
