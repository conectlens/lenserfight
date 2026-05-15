import '@xyflow/react/dist/style.css'
import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { WorkflowExecutionService } from '@lenserfight/infra/execution'
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
import { AlertTriangle, Info, Pencil, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HelpButton } from '@lenserfight/ui/components'

import { useSaveWorkflow } from '../hooks/useSaveWorkflow'
import { useWorkflowSimulation } from '../hooks/useWorkflowSimulation'

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

function nodeFingerprint(node: UpsertNodeInput): string {
  return JSON.stringify({
    id: node.id ?? null,
    lens_id: node.lens_id,
    version_id: node.version_id ?? null,
    label: node.label ?? null,
    ordinal: node.ordinal ?? null,
    position_x: node.position_x,
    position_y: node.position_y,
    config: node.config ?? null,
  })
}

function edgeFingerprint(edge: UpsertEdgeInput): string {
  return JSON.stringify({
    id: edge.id ?? null,
    source_node_id: edge.source_node_id,
    target_node_id: edge.target_node_id,
    source_output_key: edge.source_output_key ?? 'output',
    target_param_label: edge.target_param_label,
  })
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
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { mutateAsync: saveWorkflow } = useSaveWorkflow()
  const queryClient = useQueryClient()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flowNodesRef = useRef<Node<WorkflowNodeData>[]>([])
  const flowEdgesRef = useRef<Edge[]>([])
  const lastSavedNodeFingerprintRef = useRef<Map<string, string>>(new Map())
  const lastSavedEdgeFingerprintRef = useRef<Map<string, string>>(new Map())
  const hasAppliedInitialLayoutRef = useRef(false)

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

  // Stable refs for callbacks so the re-seed effect doesn't depend on them
  const onConfigNodeRef = useRef(onConfigNode)
  const onEditLensRef = useRef(onEditLens)
  const currentUserIdRef = useRef(currentUserId)
  const nodeConfigOverridesRef = useRef(nodeConfigOverrides)
  useEffect(() => { onConfigNodeRef.current = onConfigNode }, [onConfigNode])
  useEffect(() => { onEditLensRef.current = onEditLens }, [onEditLens])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])
  useEffect(() => { nodeConfigOverridesRef.current = nodeConfigOverrides }, [nodeConfigOverrides])

  const buildFlowNodes = useCallback(
    (records: WorkflowNodeRecord[]) =>
      records.map((n) =>
        toFlowNode(n, handleRemoveNode, onConfigNodeRef.current, onEditLensRef.current, currentUserIdRef.current, nodeConfigOverridesRef.current)
      ),
    [handleRemoveNode]
  )

  const buildFlowEdges = useCallback(
    (records: WorkflowEdgeRecord[]) => records.map((e) => toFlowEdge(e, handleRemoveEdge)),
    [handleRemoveEdge]
  )

  // Re-seed when DB records change. We fingerprint the records so that parent
  // re-renders that only change callback references don't wipe the canvas.
  const nodeRecordsFingerprintRef = useRef<string>('')
  const edgeRecordsFingerprintRef = useRef<string>('')

  useEffect(() => {
    const nodeFp = JSON.stringify(nodeRecords.map((n) => n.id + n.ordinal + n.position_x + n.position_y))
    const edgeFp = JSON.stringify(edgeRecords.map((e) => e.id + e.source_node_id + e.target_node_id))

    const nodeChanged = nodeFp !== nodeRecordsFingerprintRef.current
    const edgeChanged = edgeFp !== edgeRecordsFingerprintRef.current
    if (!nodeChanged && !edgeChanged) return

    nodeRecordsFingerprintRef.current = nodeFp
    edgeRecordsFingerprintRef.current = edgeFp

    const nextNodes = buildFlowNodes(nodeRecords)
    const nextEdges = buildFlowEdges(edgeRecords)

    if (!hasAppliedInitialLayoutRef.current && nextNodes.length > 0) {
      hasAppliedInitialLayoutRef.current = true
      setNodes(computeTreeLayout(nextNodes, nextEdges))
      setEdges(nextEdges)

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          fitView({ padding: 0.25, duration: 200 })
        })
      }
      return
    }

    setNodes(nextNodes)
    setEdges(nextEdges)
  }, [nodeRecords, edgeRecords, buildFlowNodes, buildFlowEdges, fitView, setNodes, setEdges])

  // Sync config overrides into existing nodes without re-seeding positions
  useEffect(() => {
    if (!nodeConfigOverrides) return
    setNodes((nds) => nds.map((n) => {
      const override = nodeConfigOverrides[n.id]
      if (!override) return n
      return { ...n, data: { ...n.data, config: override } }
    }))
  }, [nodeConfigOverrides, setNodes])

  // ── Sync refs with latest state ───────────────────────────────────────────
  useEffect(() => { flowNodesRef.current = flowNodes }, [flowNodes])
  useEffect(() => { flowEdgesRef.current = flowEdges }, [flowEdges])

  useEffect(() => {
    const nodeMap = new Map<string, string>()
    for (const record of nodeRecords) {
      nodeMap.set(record.id, nodeFingerprint({
        id: record.id,
        lens_id: record.lens_id,
        version_id: record.version_id ?? null,
        label: record.label ?? undefined,
        ordinal: record.ordinal,
        position_x: record.position_x,
        position_y: record.position_y,
        config: record.config ?? null,
      }))
    }
    lastSavedNodeFingerprintRef.current = nodeMap

    const edgeMap = new Map<string, string>()
    for (const record of edgeRecords) {
      edgeMap.set(record.id, edgeFingerprint({
        id: record.id,
        source_node_id: record.source_node_id,
        target_node_id: record.target_node_id,
        source_output_key: record.source_output_key,
        target_param_label: record.target_param_label,
      }))
    }
    lastSavedEdgeFingerprintRef.current = edgeMap
  }, [nodeRecords, edgeRecords])

  // ── Cleanup pending save on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  // ── Debounced save ────────────────────────────────────────────────────────
  // NOTE: saveWorkflow is called in the timeout callback body, NOT inside a
  // React state updater. State updaters are double-invoked in StrictMode,
  // which would cause duplicate POST requests. Reading state via refs is safe.
  const scheduleSave = useCallback((options?: { persistNodes?: boolean; persistEdges?: boolean }) => {
    if (readOnly) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const persistNodes = options?.persistNodes ?? true
      const persistEdges = options?.persistEdges ?? true
      const nds = flowNodesRef.current
      const eds = flowEdgesRef.current
      const upsertNodes: UpsertNodeInput[] = nds.map((n, i) => {
        const d = n.data as WorkflowNodeData & { lens_id?: string }
        const cfg = d.config && Object.keys(d.config).length > 0 ? d.config : undefined
        return {
          id: n.id.startsWith('tmp-') ? undefined : n.id,
          lens_id: d.lens_id ?? n.id,
          version_id: null,
          label: d.label,
          ordinal: d.ordinal ?? i,
          position_x: n.position.x,
          position_y: n.position.y,
          config: (cfg as Record<string, unknown> | undefined) ?? null,
        }
      })
      const upsertEdges: UpsertEdgeInput[] = eds
        .map((e) => ({
          id: e.id.startsWith('tmp-edge-') ? undefined : e.id,
          source_node_id: e.source,
          target_node_id: e.target,
          source_output_key:
            (e.data as { sourceOutputKey?: string })?.sourceOutputKey ?? 'output',
          target_param_label: e.targetHandle ?? 'input',
        }))

      const hasTemporaryNode = upsertNodes.some((n) => !n.id)
      const hasTemporaryEdge = upsertEdges.some((e) => !e.id)
      const useFullReplace = hasTemporaryNode || hasTemporaryEdge

      const changedNodes = useFullReplace
        ? upsertNodes
        : upsertNodes.filter((node) => {
            if (!node.id) return true
            const previous = lastSavedNodeFingerprintRef.current.get(node.id)
            return previous !== nodeFingerprint(node)
          })

      const changedEdges = useFullReplace
        ? upsertEdges
        : upsertEdges.filter((edge) => {
            if (!edge.id) return true
            const previous = lastSavedEdgeFingerprintRef.current.get(edge.id)
            return previous !== edgeFingerprint(edge)
          })

      const shouldPersistNodes = persistNodes && changedNodes.length > 0
      const shouldPersistEdges = persistEdges && changedEdges.length > 0
      if (!shouldPersistNodes && !shouldPersistEdges) return

      saveWorkflow({
        workflowId,
        nodes: upsertNodes,
        edges: upsertEdges,
        nodeDelta: useFullReplace ? undefined : changedNodes,
        edgeDelta: useFullReplace ? undefined : changedEdges,
        mergeMode: useFullReplace ? 'replace' : 'merge',
        persistNodes: shouldPersistNodes,
        persistEdges: shouldPersistEdges,
      })
        .then(({ nodes: savedNodes, edges: savedEdges }) => {
          if (useFullReplace) {
            if (savedNodes.length > 0) {
              const nextNodeMap = new Map<string, string>()
              for (const record of savedNodes) {
                nextNodeMap.set(record.id, nodeFingerprint({
                  id: record.id,
                  lens_id: record.lens_id,
                  version_id: record.version_id ?? null,
                  label: record.label ?? undefined,
                  ordinal: record.ordinal,
                  position_x: record.position_x,
                  position_y: record.position_y,
                  config: record.config ?? null,
                }))
              }
              lastSavedNodeFingerprintRef.current = nextNodeMap
              setNodes(
                savedNodes.map((record) =>
                  toFlowNode(record, handleRemoveNode, onConfigNodeRef.current, onEditLensRef.current, currentUserIdRef.current, nodeConfigOverridesRef.current)
                )
              )
            }

            if (savedEdges.length > 0) {
              const nextEdgeMap = new Map<string, string>()
              for (const record of savedEdges) {
                nextEdgeMap.set(record.id, edgeFingerprint({
                  id: record.id,
                  source_node_id: record.source_node_id,
                  target_node_id: record.target_node_id,
                  source_output_key: record.source_output_key,
                  target_param_label: record.target_param_label,
                }))
              }
              lastSavedEdgeFingerprintRef.current = nextEdgeMap
              setEdges(savedEdges.map((record) => toFlowEdge(record, handleRemoveEdge)))
            }
            return
          }

          if (savedNodes.length > 0) {
            const nextNodeMap = new Map(lastSavedNodeFingerprintRef.current)
            for (const record of savedNodes) {
              nextNodeMap.set(record.id, nodeFingerprint({
                id: record.id,
                lens_id: record.lens_id,
                version_id: record.version_id ?? null,
                label: record.label ?? undefined,
                ordinal: record.ordinal,
                position_x: record.position_x,
                position_y: record.position_y,
                config: record.config ?? null,
              }))
            }
            lastSavedNodeFingerprintRef.current = nextNodeMap
            setNodes((prev) => {
              const byId = new Map(prev.map((n) => [n.id, n]))
              for (const record of savedNodes) {
                byId.set(record.id, toFlowNode(record, handleRemoveNode, onConfigNodeRef.current, onEditLensRef.current, currentUserIdRef.current, nodeConfigOverridesRef.current))
              }
              return Array.from(byId.values())
            })
          }

          if (savedEdges.length > 0) {
            const nextEdgeMap = new Map(lastSavedEdgeFingerprintRef.current)
            for (const record of savedEdges) {
              nextEdgeMap.set(record.id, edgeFingerprint({
                id: record.id,
                source_node_id: record.source_node_id,
                target_node_id: record.target_node_id,
                source_output_key: record.source_output_key,
                target_param_label: record.target_param_label,
              }))
            }
            lastSavedEdgeFingerprintRef.current = nextEdgeMap
            setEdges((prev) => {
              const byId = new Map(prev.map((e) => [e.id, e]))
              for (const record of savedEdges) {
                byId.set(record.id, toFlowEdge(record, handleRemoveEdge))
              }
              return Array.from(byId.values())
            })
          }
        })
        .catch(() => null)
    }, 1500)
  }, [readOnly, workflowId, saveWorkflow, handleRemoveNode, handleRemoveEdge, setNodes, setEdges])

  // NOTE: nodeConfigOverrides changes are intentionally NOT wired to scheduleSave here.
  // Config overrides are synced into node data above and are included in the next
  // save triggered by a drag / connect / drop user action.

  // ── Connect nodes ─────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `tmp-edge-${Date.now()}`,
        type: 'workflowEdge',
        data: { sourceOutputKey: 'output', onRemove: handleRemoveEdge },
      } as Edge

      // Cycle detection: check if adding this edge would create a cycle
      const allNodes = flowNodesRef.current.map((n) => ({ id: n.id }))
      const allEdges = [
        ...flowEdgesRef.current.map((e) => ({ sourceNodeId: e.source, targetNodeId: e.target })),
        { sourceNodeId: connection.source!, targetNodeId: connection.target! },
      ]
      const cycleNodes = WorkflowExecutionService.detectCycle(allNodes, allEdges)
      if (cycleNodes) {
        // Reject the connection — cycle detected
        console.warn('[WorkflowCanvas] Cycle detected, rejecting edge:', cycleNodes)
        return
      }

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

  const onNodeDragStop = useCallback(() => {
    // Intentionally no-op: node position drags are local-only and should not
    // trigger persistence RPCs.
  }, [])

  // ── Simulation diagnostics (Phase 8) ───────────────────────────────────
  // Runs the pure Phase 5 simulator over the current graph on every edit.
  // Output drives:
  //   * a floating diagnostics panel (top-right)
  //   * badges on offending nodes/edges via xyflow className overrides
  //
  // The simulator is O(V+E) and cheap; we only need to stabilise the input
  // arrays to avoid re-allocating on every React re-render.
  const simNodes = useMemo(
    () =>
      flowNodes.map((n) => {
        const data = n.data as WorkflowNodeData & { lens_id?: string }
        const incomingLabels = flowEdges
          .filter((e) => e.target === n.id)
          .map((e) => e.targetHandle ?? 'input')
        return {
          id: n.id,
          lensId: data.lens_id ?? '',
          kind: 'text' as const,
          paramLabels: incomingLabels,
        }
      }),
    [flowNodes, flowEdges],
  )

  const simEdges = useMemo(
    () =>
      flowEdges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceOutputKey:
          (e.data as { sourceOutputKey?: string } | undefined)?.sourceOutputKey ?? 'output',
        targetParamLabel: e.targetHandle ?? 'input',
      })),
    [flowEdges],
  )

  const simulationReport = useWorkflowSimulation({
    nodes: simNodes,
    edges: simEdges,
    enabled: !readOnly && flowNodes.length > 0,
  })

  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true)
  const errorCount = simulationReport.diagnostics.filter((d) => d.severity === 'error').length
  const warnCount = simulationReport.diagnostics.filter((d) => d.severity === 'warn').length
  const showDiagnostics = !readOnly && (errorCount > 0 || warnCount > 0)

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
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              title="Edit workflow settings"
              className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-base px-2.5 py-1.5 text-xs font-medium text-greyscale-500 shadow-sm transition-colors hover:text-greyscale-900 hover:bg-surface-raised dark:hover:text-greyscale-100"
            >
              <Pencil size={12} />
              Edit
            </button>
            <HelpButton path="/tutorials/walkthroughs/create-a-workflow" label="Builder Guide" />
          </div>
        </Panel>
      )}
      {showDiagnostics && diagnosticsOpen && (
        <Panel position="top-right">
          <div className="flex w-80 flex-col rounded-2xl border border-surface-border bg-surface-base shadow-lg">
            <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
              <AlertTriangle size={14} className={errorCount > 0 ? 'text-status-red' : 'text-primary-yellow-600'} />
              <span className="flex-1 text-xs font-semibold text-greyscale-800 dark:text-greyscale-100">
                Simulation diagnostics
              </span>
              <button
                onClick={() => setDiagnosticsOpen(false)}
                className="rounded-md p-0.5 text-greyscale-400 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-100"
                title="Hide"
                type="button"
              >
                <X size={12} />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
              {simulationReport.diagnostics.map((d, i) => (
                <div
                  key={`${d.code}-${d.nodeId ?? d.edgeId ?? i}`}
                  className={`mb-1.5 flex items-start gap-1.5 ${d.severity === 'error' ? 'text-status-red' : 'text-primary-yellow-700 dark:text-primary-yellow-400'}`}
                >
                  {d.severity === 'error' ? (
                    <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                  ) : (
                    <Info size={11} className="mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="font-mono">{d.code}</span>
                    <span className="ml-1 text-greyscale-600 dark:text-greyscale-300">
                      {d.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-border px-3 py-1.5 text-[10px] text-greyscale-400">
              {errorCount} error{errorCount === 1 ? '' : 's'} · {warnCount} warning{warnCount === 1 ? '' : 's'} · {simulationReport.waves.length} wave{simulationReport.waves.length === 1 ? '' : 's'}
            </div>
          </div>
        </Panel>
      )}
      {showDiagnostics && !diagnosticsOpen && (
        <Panel position="top-right">
          <button
            onClick={() => setDiagnosticsOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors ${errorCount > 0 ? 'border-status-red/40 bg-status-red/10 text-status-red' : 'border-primary-yellow-500/40 bg-primary-yellow-500/10 text-primary-yellow-700'}`}
            type="button"
            title="Show simulation diagnostics"
          >
            <AlertTriangle size={12} />
            {errorCount > 0 ? `${errorCount} error${errorCount === 1 ? '' : 's'}` : `${warnCount} warning${warnCount === 1 ? '' : 's'}`}
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
