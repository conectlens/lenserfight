import '@xyflow/react/dist/style.css'
import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import {
  WorkflowExecutionService,
  getWorkflowNodeCatalogEntry,
  getWorkflowNodeCompatibilityWarning,
  isWorkflowUtilityNodeType,
} from '@lenserfight/infra/execution'
import { useLocale } from '@lenserfight/shared/i18n-locale'
import { HelpButton } from '@lenserfight/ui/components'
import { getWorkflowNodeDocsHref } from '../utils/workflow-node-docs'
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
import { toast } from 'sonner'

import { createWorkflowCanvasPaste, encodeWorkflowCanvasClipboard, parseWorkflowCanvasClipboard, serializeWorkflowCanvasSelection } from '../canvas/clipboard/workflow-canvas-clipboard'
import { createWorkflowCanvasCommandRegistry, getWorkflowCanvasCommand, isWorkflowCanvasCommandEnabled } from '../canvas/commands/workflow-canvas-commands'
import { WorkflowCanvasCommandPalette } from '../canvas/components/WorkflowCanvasCommandPalette'
import { WorkflowCanvasContextMenu, type WorkflowCanvasContextMenuTarget } from '../canvas/components/WorkflowCanvasContextMenu'
import { WorkflowCanvasEmptyState } from '../canvas/components/WorkflowCanvasEmptyState'
import { WorkflowCanvasSelectionBar } from '../canvas/components/WorkflowCanvasSelectionBar'
import { WorkflowCanvasShortcutHelp } from '../canvas/components/WorkflowCanvasShortcutHelp'
import { WorkflowCanvasToolbar } from '../canvas/components/WorkflowCanvasToolbar'
import { createWorkflowCanvasHistory, pushWorkflowCanvasHistory, redoWorkflowCanvasHistory, undoWorkflowCanvasHistory, type WorkflowCanvasGraphSnapshot, type WorkflowCanvasHistoryState } from '../canvas/history/workflow-canvas-history'
import { matchesWorkflowCanvasShortcut, shouldSuppressWorkflowCanvasShortcut } from '../canvas/keyboard/workflow-canvas-shortcuts'
import { EMPTY_WORKFLOW_CANVAS_SELECTION, applyWorkflowSelectionToGraph, getWorkflowSelectionFromGraph, hasWorkflowCanvasSelection, selectAllWorkflowItems, type WorkflowCanvasSelection } from '../canvas/selection/workflow-canvas-selection'
import { useSaveWorkflow } from '../hooks/useSaveWorkflow'
import { useWorkflowSimulation } from '../hooks/useWorkflowSimulation'

import { WorkflowCanvasEdge } from './WorkflowCanvasEdge'
import { WorkflowCanvasNode } from './WorkflowCanvasNode'

import type { WorkflowNodeData, WorkflowNodeConfig } from './WorkflowCanvasNode'
import type { DraggedLensData } from './WorkflowLensPalette'
import type {
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  WorkflowNodeResultRecord,
  UpsertNodeInput,
  UpsertEdgeInput,
} from '@lenserfight/data/repositories'
import type {
  Connection,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  NodeMouseHandler,
  EdgeMouseHandler,
  OnSelectionChangeParams,
  SelectionDragHandler,
  XYPosition,
} from '@xyflow/react'

// ─── Type registries ──────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = { workflowNode: WorkflowCanvasNode }
const edgeTypes: EdgeTypes = { workflowEdge: WorkflowCanvasEdge }

// ─── Record → Flow node/edge converters ──────────────────────────────────────

function readConfigNodeType(config: WorkflowNodeConfig | Record<string, unknown> | null | undefined): string | undefined {
  const raw = (config as Record<string, unknown> | null | undefined)?.['node_type'] ??
    (config as Record<string, unknown> | null | undefined)?.['nodeType']
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
}

function getNodeTypeForRecord(
  record: WorkflowNodeRecord,
  nodeConfigOverrides?: Record<string, WorkflowNodeConfig>,
): string | undefined {
  const cfg = nodeConfigOverrides?.[record.id] ?? record.config
  const configNodeType = readConfigNodeType(cfg)
  if (configNodeType) return configNodeType
  return record.lens_id ? 'lens' : undefined
}

function getNodeTypeForFlowNode(node: Node<WorkflowNodeData> | undefined): string | undefined {
  if (!node) return undefined
  const configNodeType = readConfigNodeType(node.data.config)
  if (configNodeType) return configNodeType
  const rawLensId = (node.data as WorkflowNodeData & { lens_id?: string }).lens_id
  return rawLensId && !rawLensId.startsWith('__utility_') ? 'lens' : undefined
}

function toFlowNode(
  record: WorkflowNodeRecord,
  onRemove: (id: string) => void,
  onDuplicate: (id: string) => void,
  onConfigNode?: (nodeId: string, lensId: string) => void,
  onEditLens?: (lensId: string) => void,
  currentUserId?: string,
  nodeConfigOverrides?: Record<string, WorkflowNodeConfig>,
): Node<WorkflowNodeData> {
  const isLensOwner = !!currentUserId && !!record.lens_lenser_id && currentUserId === record.lens_lenser_id
  // Reconstruct __utility_ lens_id for utility nodes stored with null lens_id
  const cfgOverride = nodeConfigOverrides?.[record.id] ?? record.config
  const nodeType = readConfigNodeType(cfgOverride)
  const isUtilityNode = isWorkflowUtilityNodeType(nodeType) || !record.lens_id || record.lens_id === '00000000-0000-0000-0000-000000000000'
  const uiLensId = isUtilityNode && nodeType ? `__utility_${nodeType}` : (record.lens_id ?? '')
  return {
    id: record.id,
    type: 'workflowNode',
    position: { x: record.position_x, y: record.position_y },
    data: {
      label: record.label ?? 'Lens node',
      ordinal: record.ordinal,
      isPersisted: true,
      lens_id: uiLensId,
      lensVisibility: record.lens_visibility as 'public' | 'private' | 'unlisted' | undefined,
      lensLenserId: record.lens_lenser_id ?? undefined,
      isLensOwner,
      config: nodeConfigOverrides?.[record.id] ?? record.config ?? {},
      onRemove,
      onDuplicate,
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
  onRemove: (id: string) => void,
  nodeRecords: WorkflowNodeRecord[],
  nodeConfigOverrides?: Record<string, WorkflowNodeConfig>,
): Edge {
  const sourceRecord = nodeRecords.find((node) => node.id === record.source_node_id)
  const targetRecord = nodeRecords.find((node) => node.id === record.target_node_id)
  return {
    id: record.id,
    source: record.source_node_id,
    target: record.target_node_id,
    type: 'workflowEdge',
    data: {
      sourceOutputKey: record.source_output_key,
      sourceNodeType: sourceRecord ? getNodeTypeForRecord(sourceRecord, nodeConfigOverrides) : undefined,
      targetNodeType: targetRecord ? getNodeTypeForRecord(targetRecord, nodeConfigOverrides) : undefined,
      onRemove,
    },
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
  /** Live or dry-run node results to visualize on canvas nodes. */
  nodeResults?: WorkflowNodeResultRecord[]
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
  nodeResults,
}: WorkflowBuilderCanvasProps) {
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, setViewport } = useReactFlow()
  const { locale } = useLocale()
  const { mutateAsync: saveWorkflow } = useSaveWorkflow()
  const queryClient = useQueryClient()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flowNodesRef = useRef<Node<WorkflowNodeData>[]>([])
  const flowEdgesRef = useRef<Edge[]>([])
  const lastSavedNodeFingerprintRef = useRef<Map<string, string>>(new Map())
  const lastSavedEdgeFingerprintRef = useRef<Map<string, string>>(new Map())
  const hasAppliedInitialLayoutRef = useRef(false)
  const selectionRef = useRef<WorkflowCanvasSelection>(EMPTY_WORKFLOW_CANVAS_SELECTION)
  const dragStartSnapshotRef = useRef<WorkflowCanvasGraphSnapshot<WorkflowNodeData> | null>(null)
  const lastCanvasPositionRef = useRef<XYPosition | null>(null)
  const fallbackClipboardRef = useRef<string | null>(null)
  const pasteOffsetRef = useRef(0)
  const actionRef = useRef({
    removeNode: (_nodeId: string) => undefined as void,
    removeEdge: (_edgeId: string) => undefined as void,
    duplicateNode: (_nodeId: string) => undefined as void,
  })
  const [selection, setSelectionState] = useState<WorkflowCanvasSelection>(EMPTY_WORKFLOW_CANVAS_SELECTION)
  const [historyState, setHistoryState] = useState<WorkflowCanvasHistoryState<WorkflowNodeData>>(() =>
    createWorkflowCanvasHistory<WorkflowNodeData>(),
  )
  const historyRef = useRef(historyState)
  const [hasClipboard, setHasClipboard] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    target: WorkflowCanvasContextMenuTarget
  } | null>(null)

  // ── Remove handlers ──────────────────────────────────────────────────────
  const handleRemoveNode = useCallback((nodeId: string) => {
    actionRef.current.removeNode(nodeId)
  }, [])

  const handleRemoveEdge = useCallback((edgeId: string) => {
    actionRef.current.removeEdge(edgeId)
  }, [])

  const handleDuplicateNode = useCallback((nodeId: string) => {
    actionRef.current.duplicateNode(nodeId)
  }, [])

  // ── Flow state ────────────────────────────────────────────────────────────
  const [flowNodes, setNodes, onNodesChange] = useNodesState(
    nodeRecords.map((n) => toFlowNode(n, handleRemoveNode, handleDuplicateNode, onConfigNode, onEditLens, currentUserId, nodeConfigOverrides))
  )
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(
    edgeRecords.map((e) => toFlowEdge(e, handleRemoveEdge, nodeRecords, nodeConfigOverrides))
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
        toFlowNode(n, handleRemoveNode, handleDuplicateNode, onConfigNodeRef.current, onEditLensRef.current, currentUserIdRef.current, nodeConfigOverridesRef.current)
      ),
    [handleRemoveNode, handleDuplicateNode]
  )

  const buildFlowEdges = useCallback(
    (records: WorkflowEdgeRecord[], nodesForEdges: WorkflowNodeRecord[] = nodeRecords) =>
      records.map((e) => toFlowEdge(e, handleRemoveEdge, nodesForEdges, nodeConfigOverridesRef.current)),
    [handleRemoveEdge, nodeRecords]
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
    const nextEdges = buildFlowEdges(edgeRecords, nodeRecords)

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
    setEdges((eds) => eds.map((edge) => {
      const sourceRecord = nodeRecords.find((node) => node.id === edge.source)
      const targetRecord = nodeRecords.find((node) => node.id === edge.target)
      return {
        ...edge,
        data: {
          ...(edge.data ?? {}),
          sourceNodeType: sourceRecord ? getNodeTypeForRecord(sourceRecord, nodeConfigOverrides) : undefined,
          targetNodeType: targetRecord ? getNodeTypeForRecord(targetRecord, nodeConfigOverrides) : undefined,
        },
      }
    }))
  }, [nodeConfigOverrides, nodeRecords, setEdges, setNodes])

  // Sync execution status from live run / dry-run into canvas nodes.
  // Uses ring-* classes (not border-*) so the category/visibility border is preserved.
  // This effect is intentionally excluded from fingerprinting and save logic —
  // executionStatus is ephemeral and must never trigger a DB write.
  useEffect(() => {
    if (!nodeResults || nodeResults.length === 0) {
      setNodes((nds) => {
        const anyHasStatus = nds.some((n) => (n.data as Record<string, unknown>)['executionStatus'] != null)
        if (!anyHasStatus) return nds
        return nds.map((n) => {
          if ((n.data as Record<string, unknown>)['executionStatus'] == null &&
              (n.data as Record<string, unknown>)['executionWarning'] == null) return n
          return { ...n, data: { ...n.data, executionStatus: null, executionWarning: null } }
        })
      })
      return
    }
    const resultIndex = new Map(nodeResults.map((r) => [r.node_id, r]))
    setNodes((nds) => nds.map((n) => {
      const result = resultIndex.get(n.id)
      const status = result?.status ?? null
      const warning = (result?.output_data as Record<string, unknown> | null | undefined)?.['_dryRunWarning'] as string | null | undefined ?? null
      const currentData = n.data as Record<string, unknown>
      if (currentData['executionStatus'] === status && currentData['executionWarning'] === warning) return n
      return { ...n, data: { ...n.data, executionStatus: status, executionWarning: warning } }
    }))
  }, [nodeResults, setNodes])

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
  const scheduleSave = useCallback((options?: { persistNodes?: boolean; persistEdges?: boolean; forceAll?: boolean; immediate?: boolean }) => {
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
        // Utility nodes use __utility_ prefix in the UI — persist as null lens_id (column is nullable)
        const rawLensId = d.lens_id ?? n.id
        const persistLensId = rawLensId.startsWith('__utility_') ? null : rawLensId
        return {
          id: n.id.startsWith('tmp-') ? undefined : n.id,
          lens_id: persistLensId,
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

      const changedNodes = options?.forceAll || useFullReplace
        ? upsertNodes
        : upsertNodes.filter((node) => {
            if (!node.id) return true
            const previous = lastSavedNodeFingerprintRef.current.get(node.id)
            return previous !== nodeFingerprint(node)
          })

      const changedEdges = options?.forceAll || useFullReplace
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
                  toFlowNode(record, handleRemoveNode, handleDuplicateNode, onConfigNodeRef.current, onEditLensRef.current, currentUserIdRef.current, nodeConfigOverridesRef.current)
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
              setEdges(savedEdges.map((record) => toFlowEdge(record, handleRemoveEdge, savedNodes, nodeConfigOverridesRef.current)))
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
                byId.set(record.id, toFlowNode(record, handleRemoveNode, handleDuplicateNode, onConfigNodeRef.current, onEditLensRef.current, currentUserIdRef.current, nodeConfigOverridesRef.current))
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
                byId.set(record.id, toFlowEdge(record, handleRemoveEdge, nodeRecords, nodeConfigOverridesRef.current))
              }
              return Array.from(byId.values())
            })
          }
        })
        .catch(() => null)
    }, options?.immediate ? 0 : 1500)
  }, [readOnly, workflowId, saveWorkflow, handleRemoveNode, handleDuplicateNode, handleRemoveEdge, nodeRecords, setNodes, setEdges])

  const setSelection = useCallback((nextSelection: WorkflowCanvasSelection) => {
    selectionRef.current = nextSelection
    setSelectionState(nextSelection)
  }, [])

  const makeSnapshot = useCallback((): WorkflowCanvasGraphSnapshot<WorkflowNodeData> => ({
    nodes: flowNodesRef.current,
    edges: flowEdgesRef.current,
    selection: selectionRef.current,
  }), [])

  const applySnapshot = useCallback((snapshot: WorkflowCanvasGraphSnapshot<WorkflowNodeData>) => {
    const selected = applyWorkflowSelectionToGraph(snapshot.nodes, snapshot.edges, snapshot.selection)
    flowNodesRef.current = selected.nodes
    flowEdgesRef.current = selected.edges
    setNodes(selected.nodes)
    setEdges(selected.edges)
    setSelection(snapshot.selection)
  }, [setEdges, setNodes, setSelection])

  const persistGraphTransition = useCallback((
    before: WorkflowCanvasGraphSnapshot<WorkflowNodeData>,
    after: WorkflowCanvasGraphSnapshot<WorkflowNodeData>,
  ) => {
    if (readOnly) return

    const nextNodeIds = new Set(after.nodes.map((node) => node.id))
    const nextEdgeIds = new Set(after.edges.map((edge) => edge.id))
    const removedNodeIds = before.nodes
      .map((node) => node.id)
      .filter((id) => !nextNodeIds.has(id))
    const removedEdgeIds = before.edges
      .map((edge) => edge.id)
      .filter((id) => !nextEdgeIds.has(id))

    for (const edgeId of removedEdgeIds) {
      lastSavedEdgeFingerprintRef.current.delete(edgeId)
      if (!edgeId.startsWith('tmp-edge-')) {
        workflowsService.deleteEdge(edgeId).catch(() => null)
      }
    }
    for (const nodeId of removedNodeIds) {
      lastSavedNodeFingerprintRef.current.delete(nodeId)
      if (!nodeId.startsWith('tmp-')) {
        workflowsService.deleteNode(nodeId).catch(() => null)
      }
    }

    if (removedNodeIds.length > 0) {
      queryClient.setQueryData(
        queryKeys.workflows.nodes(workflowId),
        (old: WorkflowNodeRecord[] | undefined) => (old ?? []).filter((node) => !removedNodeIds.includes(node.id)),
      )
    }
    if (removedEdgeIds.length > 0) {
      queryClient.setQueryData(
        queryKeys.workflows.edges(workflowId),
        (old: WorkflowEdgeRecord[] | undefined) => (old ?? []).filter((edge) => !removedEdgeIds.includes(edge.id)),
      )
    }

    scheduleSave({ forceAll: true })
  }, [queryClient, readOnly, scheduleSave, workflowId])

  const commitGraphSnapshot = useCallback((
    label: string,
    before: WorkflowCanvasGraphSnapshot<WorkflowNodeData>,
    after: WorkflowCanvasGraphSnapshot<WorkflowNodeData>,
  ) => {
    applySnapshot(after)
    setHistoryState((current) => {
      const next = pushWorkflowCanvasHistory(current, { label, before, after })
      historyRef.current = next
      return next
    })
    persistGraphTransition(before, after)
  }, [applySnapshot, persistGraphTransition])

  const setGraphWithoutHistory = useCallback((
    nextNodes: Node<WorkflowNodeData>[],
    nextEdges: Edge[],
    nextSelection: WorkflowCanvasSelection,
  ) => {
    applySnapshot({ nodes: nextNodes, edges: nextEdges, selection: nextSelection })
  }, [applySnapshot])

  const deleteGraphItems = useCallback((
    label: string,
    targetSelection: WorkflowCanvasSelection = selectionRef.current,
  ) => {
    if (readOnly || !hasWorkflowCanvasSelection(targetSelection)) return
    const before = makeSnapshot()
    const nodeIds = new Set(targetSelection.nodeIds)
    const edgeIds = new Set(targetSelection.edgeIds)
    const nextNodes = before.nodes.filter((node) => !nodeIds.has(node.id))
    const nextEdges = before.edges.filter((edge) =>
      !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)
    )
    commitGraphSnapshot(label, before, {
      nodes: nextNodes,
      edges: nextEdges,
      selection: EMPTY_WORKFLOW_CANVAS_SELECTION,
    })
  }, [commitGraphSnapshot, makeSnapshot, readOnly])

  const hydratePastedNodeData = useCallback((data: Record<string, unknown>): WorkflowNodeData => {
    const lensId = typeof data.lens_id === 'string' ? data.lens_id : undefined
    const lensLenserId = typeof data.lensLenserId === 'string' ? data.lensLenserId : undefined
    return {
      ...(data as WorkflowNodeData),
      isPersisted: false,
      lens_id: lensId,
      isLensOwner: !!currentUserIdRef.current && currentUserIdRef.current === lensLenserId,
      onRemove: handleRemoveNode,
      onDuplicate: handleDuplicateNode,
      onConfigNode: onConfigNodeRef.current,
      onEditLens: lensLenserId && currentUserIdRef.current === lensLenserId ? onEditLensRef.current : undefined,
    }
  }, [handleDuplicateNode, handleRemoveNode])

  const hydratePastedEdgeData = useCallback((data: Record<string, unknown> | undefined) => ({
    ...(data ?? {}),
    onRemove: handleRemoveEdge,
  }), [handleRemoveEdge])

  const writeClipboardPayload = useCallback(async (payload: ReturnType<typeof serializeWorkflowCanvasSelection>) => {
    if (!payload) return false
    const encoded = encodeWorkflowCanvasClipboard(payload)
    fallbackClipboardRef.current = encoded
    setHasClipboard(true)
    try {
      if (typeof navigator !== 'undefined') await navigator.clipboard?.writeText(encoded)
    } catch {
      // Browser clipboard can fail outside secure contexts; the in-memory payload still works.
    }
    return true
  }, [])

  const readClipboardPayload = useCallback(async () => {
    let raw: string | null = null
    try {
      raw = typeof navigator !== 'undefined' ? await navigator.clipboard?.readText() : null
    } catch {
      raw = null
    }
    const parsed = raw ? parseWorkflowCanvasClipboard(raw) : null
    return parsed ?? (fallbackClipboardRef.current ? parseWorkflowCanvasClipboard(fallbackClipboardRef.current) : null)
  }, [])

  const copySelection = useCallback(async () => {
    const payload = serializeWorkflowCanvasSelection(flowNodesRef.current, flowEdgesRef.current, selectionRef.current)
    if (!payload) {
      toast.error('Select at least one node to copy.')
      return
    }
    const ok = await writeClipboardPayload(payload)
    if (ok) toast.success('Selection copied.')
  }, [writeClipboardPayload])

  const pastePayload = useCallback(async (payload: Awaited<ReturnType<typeof readClipboardPayload>>, label = 'Paste selection') => {
    if (!payload || readOnly) {
      toast.error('Workflow clipboard is empty or invalid.')
      return
    }
    pasteOffsetRef.current += 1
    const before = makeSnapshot()
    const paste = createWorkflowCanvasPaste(payload, before.nodes, {
      origin: lastCanvasPositionRef.current ?? undefined,
      offsetIndex: pasteOffsetRef.current,
      hydrateNodeData: hydratePastedNodeData,
      hydrateEdgeData: hydratePastedEdgeData,
    })
    const ordinalOffset = before.nodes.length
    const pastedNodes = paste.nodes.map((node, index) => ({
      ...node,
      data: {
        ...node.data,
        ordinal: ordinalOffset + index,
        onRemove: handleRemoveNode,
        onDuplicate: handleDuplicateNode,
        onConfigNode: onConfigNodeRef.current,
        onEditLens: node.data.onEditLens,
      },
    }))
    commitGraphSnapshot(label, before, {
      nodes: [...before.nodes.map((node) => ({ ...node, selected: false })), ...pastedNodes],
      edges: [...before.edges.map((edge) => ({ ...edge, selected: false })), ...paste.edges],
      selection: paste.selection,
    })
  }, [
    commitGraphSnapshot,
    handleDuplicateNode,
    handleRemoveNode,
    hydratePastedEdgeData,
    hydratePastedNodeData,
    makeSnapshot,
    readOnly,
  ])

  const duplicateSelection = useCallback(async (targetSelection = selectionRef.current) => {
    const payload = serializeWorkflowCanvasSelection(flowNodesRef.current, flowEdgesRef.current, targetSelection)
    if (!payload) {
      toast.error('Select at least one node to duplicate.')
      return
    }
    await pastePayload(payload, 'Duplicate selection')
  }, [pastePayload])

  const configureSelectedNode = useCallback(() => {
    const nodeId = selectionRef.current.nodeIds[0]
    const node = flowNodesRef.current.find((candidate) => candidate.id === nodeId)
    const data = node?.data as WorkflowNodeData | undefined
    if (!node || !data?.onConfigNode) return
    data.onConfigNode(node.id, data.lens_id ?? '__utility')
  }, [])

  const renameSelectedNode = useCallback(() => {
    if (readOnly) return
    const nodeId = selectionRef.current.nodeIds[0]
    const before = makeSnapshot()
    const node = before.nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    const nextLabel = window.prompt('Rename node', node.data.label)
    if (!nextLabel?.trim()) return
    commitGraphSnapshot('Rename node', before, {
      nodes: before.nodes.map((candidate) =>
        candidate.id === nodeId ? { ...candidate, data: { ...candidate.data, label: nextLabel.trim() } } : candidate
      ),
      edges: before.edges,
      selection: before.selection,
    })
  }, [commitGraphSnapshot, makeSnapshot, readOnly])

  const toggleSelectedNodesDisabled = useCallback(() => {
    if (readOnly) return
    const selectedIds = new Set(selectionRef.current.nodeIds)
    if (selectedIds.size === 0) return
    const before = makeSnapshot()
    commitGraphSnapshot('Toggle node disabled', before, {
      nodes: before.nodes.map((node) => {
        if (!selectedIds.has(node.id)) return node
        const config = { ...(node.data.config ?? {}) } as Record<string, unknown>
        config.disabled = !Boolean(config.disabled)
        return { ...node, data: { ...node.data, config: config as WorkflowNodeConfig } }
      }),
      edges: before.edges,
      selection: before.selection,
    })
  }, [commitGraphSnapshot, makeSnapshot, readOnly])

  const selectedNodeType = useCallback(() => {
    const nodeId = selectionRef.current.nodeIds[0]
    return getNodeTypeForFlowNode(flowNodesRef.current.find((node) => node.id === nodeId))
  }, [])

  const viewSelectedNodeDocs = useCallback(() => {
    const nodeType = selectedNodeType()
    const entry = nodeType ? getWorkflowNodeCatalogEntry(nodeType) : null
    const href = entry ? getWorkflowNodeDocsHref(entry.docsPath, locale) : null
    if (!href) {
      toast.info('No node documentation is registered yet.')
      return
    }
    window.open(href, '_blank', 'noreferrer')
  }, [selectedNodeType, locale])

  const selectedEdge = useCallback(() => {
    const edgeId = selectionRef.current.edgeIds[0]
    return flowEdgesRef.current.find((edge) => edge.id === edgeId)
  }, [])

  const inspectSelectedEdgeCompatibility = useCallback(() => {
    const edge = selectedEdge()
    const data = edge?.data as { sourceNodeType?: string; targetNodeType?: string } | undefined
    const warning = getWorkflowNodeCompatibilityWarning(data?.sourceNodeType, data?.targetNodeType)
    if (warning) toast.warning(warning)
    else toast.success('This edge is compatible with the current node contracts.')
  }, [selectedEdge])

  const viewSelectedEdgeContract = useCallback(() => {
    const edge = selectedEdge()
    const data = edge?.data as { sourceNodeType?: string; targetNodeType?: string } | undefined
    const source = data?.sourceNodeType ? getWorkflowNodeCatalogEntry(data.sourceNodeType) : null
    const target = data?.targetNodeType ? getWorkflowNodeCatalogEntry(data.targetNodeType) : null
    toast.info(
      `${source?.displayName ?? 'Source'} outputs ${source?.producesOutputType ?? 'any'} → ${target?.displayName ?? 'target'} accepts ${(target?.acceptsInputTypes ?? ['any']).join(', ')}`,
    )
  }, [selectedEdge])

  const autoLayoutSelectionOrGraph = useCallback(() => {
    if (readOnly) return
    const before = makeSnapshot()
    commitGraphSnapshot('Auto-layout workflow', before, {
      nodes: computeTreeLayout(before.nodes, before.edges),
      edges: before.edges,
      selection: before.selection,
    })
    window.requestAnimationFrame(() => fitView({ padding: 0.25, duration: 200 }))
  }, [commitGraphSnapshot, fitView, makeSnapshot, readOnly])

  const undoCanvas = useCallback(() => {
    const result = undoWorkflowCanvasHistory(historyRef.current)
    historyRef.current = result.state
    setHistoryState(result.state)
    if (!result.snapshot) return
    const before = makeSnapshot()
    applySnapshot(result.snapshot)
    persistGraphTransition(before, result.snapshot)
  }, [applySnapshot, makeSnapshot, persistGraphTransition])

  const redoCanvas = useCallback(() => {
    const result = redoWorkflowCanvasHistory(historyRef.current)
    historyRef.current = result.state
    setHistoryState(result.state)
    if (!result.snapshot) return
    const before = makeSnapshot()
    applySnapshot(result.snapshot)
    persistGraphTransition(before, result.snapshot)
  }, [applySnapshot, makeSnapshot, persistGraphTransition])

  const commandState = useMemo(() => ({
    readOnly,
    hasNodes: flowNodes.length > 0,
    hasSelection: hasWorkflowCanvasSelection(selection),
    hasSelectedNode: selection.nodeIds.length > 0,
    hasSingleSelectedNode: selection.nodeIds.length === 1,
    hasSelectedEdge: selection.edgeIds.length > 0,
    canPaste: hasClipboard,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
    canRunNode: false,
  }), [flowNodes.length, hasClipboard, historyState.future.length, historyState.past.length, readOnly, selection])

  const commands = useMemo(() => createWorkflowCanvasCommandRegistry({
    selectAll: () => {
      const next = selectAllWorkflowItems(flowNodesRef.current, flowEdgesRef.current)
      setGraphWithoutHistory(flowNodesRef.current, flowEdgesRef.current, next)
    },
    clearSelection: () => {
      setContextMenu(null)
      setCommandPaletteOpen(false)
      setShortcutHelpOpen(false)
      setGraphWithoutHistory(flowNodesRef.current, flowEdgesRef.current, EMPTY_WORKFLOW_CANVAS_SELECTION)
    },
    deleteSelection: () => deleteGraphItems('Delete selection'),
    copy: copySelection,
    cut: async () => {
      const payload = serializeWorkflowCanvasSelection(flowNodesRef.current, flowEdgesRef.current, selectionRef.current)
      if (await writeClipboardPayload(payload)) deleteGraphItems('Cut selection')
    },
    paste: async () => pastePayload(await readClipboardPayload()),
    duplicate: () => duplicateSelection(),
    undo: undoCanvas,
    redo: redoCanvas,
    save: () => {
      scheduleSave({ forceAll: true, immediate: true })
      toast.success('Workflow save queued.')
    },
    openCommandPalette: () => setCommandPaletteOpen(true),
    openShortcutHelp: () => setShortcutHelpOpen(true),
    zoomIn: () => { void zoomIn({ duration: 150 }) },
    zoomOut: () => { void zoomOut({ duration: 150 }) },
    resetZoom: () => { void setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 150 }) },
    fitView: () => { void fitView({ padding: 0.25, duration: 200 }) },
    autoLayout: autoLayoutSelectionOrGraph,
    configureNode: configureSelectedNode,
    renameNode: renameSelectedNode,
    toggleNodeDisabled: toggleSelectedNodesDisabled,
    viewNodeDocs: viewSelectedNodeDocs,
    addConnectedNode: () => toast.info('Add a connected node by dragging from the node sidebar, then connect from the source handle.'),
    runNode: () => toast.info('Node test runs are not enabled for this node yet.'),
    deleteEdge: () => deleteGraphItems('Delete edge', { nodeIds: [], edgeIds: selectionRef.current.edgeIds }),
    inspectEdgeCompatibility: inspectSelectedEdgeCompatibility,
    viewEdgeContract: viewSelectedEdgeContract,
    addNode: () => toast.info('Drag a lens or utility node from the left sidebar to add it here.'),
    createNote: () => toast.info('Canvas notes are not part of the workflow schema yet.'),
    createGroup: () => toast.info('Canvas groups are not part of the workflow schema yet.'),
    changeEdgeMode: () => toast.info('Edge modes are not part of the workflow schema yet.'),
  }, commandState), [
    autoLayoutSelectionOrGraph,
    commandState,
    configureSelectedNode,
    copySelection,
    deleteGraphItems,
    duplicateSelection,
    fitView,
    inspectSelectedEdgeCompatibility,
    pastePayload,
    readClipboardPayload,
    redoCanvas,
    renameSelectedNode,
    scheduleSave,
    setGraphWithoutHistory,
    toggleSelectedNodesDisabled,
    undoCanvas,
    viewSelectedEdgeContract,
    viewSelectedNodeDocs,
    writeClipboardPayload,
    zoomIn,
    zoomOut,
    setViewport,
  ])

  const commandsRef = useRef(commands)
  useEffect(() => { commandsRef.current = commands }, [commands])

  useEffect(() => {
    actionRef.current.removeNode = (nodeId: string) => {
      deleteGraphItems('Delete node', { nodeIds: [nodeId], edgeIds: [] })
    }
    actionRef.current.removeEdge = (edgeId: string) => {
      deleteGraphItems('Delete edge', { nodeIds: [], edgeIds: [edgeId] })
    }
    actionRef.current.duplicateNode = (nodeId: string) => {
      void duplicateSelection({ nodeIds: [nodeId], edgeIds: [] })
    }
  }, [deleteGraphItems, duplicateSelection])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldSuppressWorkflowCanvasShortcut(event.target) && event.key !== 'Escape') return
      const command = commandsRef.current.find((candidate) =>
        candidate.shortcut && matchesWorkflowCanvasShortcut(event, candidate.shortcut)
      )
      if (!command || !isWorkflowCanvasCommandEnabled(command)) return
      event.preventDefault()
      void command.run()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // NOTE: nodeConfigOverrides changes are intentionally NOT wired to scheduleSave here.
  // Config overrides are synced into node data above and are included in the next
  // save triggered by a drag / connect / drop user action.

  // ── Connect nodes ─────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = flowNodesRef.current.find((node) => node.id === connection.source)
      const targetNode = flowNodesRef.current.find((node) => node.id === connection.target)
      const newEdge: Edge = {
        ...connection,
        id: `tmp-edge-${Date.now()}`,
        type: 'workflowEdge',
        data: {
          sourceOutputKey: 'output',
          sourceNodeType: getNodeTypeForFlowNode(sourceNode),
          targetNodeType: getNodeTypeForFlowNode(targetNode),
          onRemove: handleRemoveEdge,
        },
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

      const before = makeSnapshot()
      const nextEdges = addEdge(newEdge, before.edges)
      commitGraphSnapshot('Connect nodes', before, {
        nodes: computeTreeLayout(before.nodes, nextEdges),
        edges: nextEdges,
        selection: { nodeIds: [], edgeIds: [newEdge.id] },
      })
    },
    [commitGraphSnapshot, handleRemoveEdge, makeSnapshot]
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
      let lensData: DraggedLensData & { node_type?: string }
      try {
        lensData = JSON.parse(raw) as DraggedLensData & { node_type?: string }
      } catch {
        toast.error('Could not read dropped workflow node.')
        return
      }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const nextOrdinal = flowNodes.length
      // Utility nodes use a __utility_ prefix in lens_id — extract node_type
      // and set it in config so the execution layer knows the runner type.
      const isUtility = lensData.lens_id?.startsWith('__utility_')
      const nodeTypeFromDrag = isUtility
        ? lensData.node_type ?? lensData.lens_id?.replace('__utility_', '')
        : undefined
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
          config: nodeTypeFromDrag ? { node_type: nodeTypeFromDrag, nodeType: nodeTypeFromDrag } as WorkflowNodeConfig : {},
          onRemove: handleRemoveNode,
          onDuplicate: handleDuplicateNode,
          onConfigNode,
          onEditLens: (!!currentUserId && currentUserId === lensData.lenser_id) ? onEditLens : undefined,
        } as WorkflowNodeData & { lens_id: string },
      }
      const before = makeSnapshot()
      commitGraphSnapshot('Add node', before, {
        nodes: [...before.nodes.map((node) => ({ ...node, selected: false })), newNode],
        edges: before.edges.map((edge) => ({ ...edge, selected: false })),
        selection: { nodeIds: [newNode.id], edgeIds: [] },
      })
    },
    [
      screenToFlowPosition,
      flowNodes.length,
      handleRemoveNode,
      handleDuplicateNode,
      onConfigNode,
      onEditLens,
      currentUserId,
      makeSnapshot,
      commitGraphSnapshot,
    ]
  )

  const onNodeDragStart: NodeMouseHandler<Node<WorkflowNodeData>> = useCallback(() => {
    dragStartSnapshotRef.current = makeSnapshot()
  }, [makeSnapshot])

  const onNodeDragStop: NodeMouseHandler<Node<WorkflowNodeData>> = useCallback(() => {
    const before = dragStartSnapshotRef.current
    dragStartSnapshotRef.current = null
    if (!before || readOnly) return
    commitGraphSnapshot('Move node', before, makeSnapshot())
  }, [commitGraphSnapshot, makeSnapshot, readOnly])

  const onSelectionDragStart: SelectionDragHandler<Node<WorkflowNodeData>> = useCallback(() => {
    dragStartSnapshotRef.current = makeSnapshot()
  }, [makeSnapshot])

  const onSelectionDragStop: SelectionDragHandler<Node<WorkflowNodeData>> = useCallback(() => {
    const before = dragStartSnapshotRef.current
    dragStartSnapshotRef.current = null
    if (!before || readOnly) return
    commitGraphSnapshot('Move selection', before, makeSnapshot())
  }, [commitGraphSnapshot, makeSnapshot, readOnly])

  const onSelectionChange = useCallback((params: OnSelectionChangeParams<Node<WorkflowNodeData>, Edge>) => {
    setSelection(getWorkflowSelectionFromGraph(params.nodes, params.edges))
  }, [setSelection])

  const resolveMenuPoint = useCallback((event: MouseEvent | React.MouseEvent) => {
    const bounds = canvasContainerRef.current?.getBoundingClientRect()
    return bounds
      ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      : { x: event.clientX, y: event.clientY }
  }, [])

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    lastCanvasPositionRef.current = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const point = resolveMenuPoint(event)
    setContextMenu({ ...point, target: 'canvas' })
  }, [resolveMenuPoint, screenToFlowPosition])

  const onNodeContextMenu: NodeMouseHandler<Node<WorkflowNodeData>> = useCallback((event, node) => {
    event.preventDefault()
    if (!node.selected) {
      setGraphWithoutHistory(flowNodesRef.current, flowEdgesRef.current, { nodeIds: [node.id], edgeIds: [] })
    }
    const point = resolveMenuPoint(event)
    setContextMenu({ ...point, target: selectionRef.current.nodeIds.length > 1 ? 'selection' : 'node' })
  }, [resolveMenuPoint, setGraphWithoutHistory])

  const onEdgeContextMenu: EdgeMouseHandler<Edge> = useCallback((event, edge) => {
    event.preventDefault()
    if (!edge.selected) {
      setGraphWithoutHistory(flowNodesRef.current, flowEdgesRef.current, { nodeIds: [], edgeIds: [edge.id] })
    }
    const point = resolveMenuPoint(event)
    setContextMenu({ ...point, target: 'edge' })
  }, [resolveMenuPoint, setGraphWithoutHistory])

  const onSelectionContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    const point = resolveMenuPoint(event)
    setContextMenu({ ...point, target: 'selection' })
  }, [resolveMenuPoint])

  const onPaneClick = useCallback(() => {
    setContextMenu(null)
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
    () => {
      const nodeIds = new Set(flowNodes.map((n) => n.id))
      return flowEdges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          sourceOutputKey:
            (e.data as { sourceOutputKey?: string } | undefined)?.sourceOutputKey ?? 'output',
          targetParamLabel: e.targetHandle ?? 'input',
        }))
    },
    [flowNodes, flowEdges],
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
    <div ref={canvasContainerRef} className="relative h-full w-full">
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
        onNodeDragStart={readOnly ? undefined : onNodeDragStart}
        onNodeDragStop={readOnly ? undefined : onNodeDragStop}
        onSelectionDragStart={readOnly ? undefined : onSelectionDragStart}
        onSelectionDragStop={readOnly ? undefined : onSelectionDragStop}
        onSelectionChange={onSelectionChange}
        onPaneContextMenu={readOnly ? undefined : onPaneContextMenu}
        onNodeContextMenu={readOnly ? undefined : onNodeContextMenu}
        onEdgeContextMenu={readOnly ? undefined : onEdgeContextMenu}
        onSelectionContextMenu={readOnly ? undefined : onSelectionContextMenu}
        onPaneClick={onPaneClick}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        selectionOnDrag={!readOnly}
        panActivationKeyCode="Space"
        panOnDrag={false}
        panOnScroll
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        deleteKeyCode={null}
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
      {!readOnly && (
        <Panel position="top-center">
          <WorkflowCanvasToolbar commands={commands} />
        </Panel>
      )}
      {!readOnly && hasWorkflowCanvasSelection(selection) && (
        <Panel position="bottom-center">
          <WorkflowCanvasSelectionBar selection={selection} commands={commands} />
        </Panel>
      )}
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
      {!readOnly && flowNodes.length === 0 && (
        <WorkflowCanvasEmptyState
          onAddNode={() => getWorkflowCanvasCommand(commands, 'canvas.addNode')?.run()}
          onOpenShortcuts={() => setShortcutHelpOpen(true)}
        />
      )}
      {contextMenu && (
        <WorkflowCanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          commands={commands}
          onClose={() => setContextMenu(null)}
        />
      )}
      <WorkflowCanvasCommandPalette
        open={commandPaletteOpen}
        commands={commands}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <WorkflowCanvasShortcutHelp
        open={shortcutHelpOpen}
        commands={commands}
        onClose={() => setShortcutHelpOpen(false)}
      />
    </div>
  )
}
