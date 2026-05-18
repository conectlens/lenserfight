import '@xyflow/react/dist/style.css'

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  type OnConnect,
} from '@xyflow/react'
import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AgentCanvasContextMenu } from './AgentCanvasContextMenu'
import { AgentCanvasNode, type AgentNodeData } from './AgentCanvasNode'
import { AgentEdgeLine } from './canvas/AgentEdgeLine'

const nodeTypes = { agentNode: AgentCanvasNode }
const edgeTypes = { agentEdge: AgentEdgeLine }

interface ContextMenuState {
  x: number
  y: number
  nodeId?: string
  agentHandle?: string
}

interface AgentGraphShellProps {
  nodes: Node[]
  edges: Edge[]
  onConnect?: OnConnect
  sidePanel?: React.ReactNode
  emptyState?: {
    title: string
    description: string
    action?: React.ReactNode
  }
  readOnly?: boolean
  onDropAgent?: (agentId: string, position: { x: number; y: number }) => void
  onNodeEdit?: (nodeId: string) => void
  onNodeRemove?: (nodeId: string) => void
  onAddMember?: () => void
  onManageEdges?: () => void
  /** Selection state (controlled from parent) */
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  onNodeSelect?: (nodeId: string | null) => void
  onEdgeSelect?: (edgeId: string | null) => void
  /** Left palette overlay inside the canvas */
  agentPaletteSlot?: React.ReactNode
}

const FlowCanvas: React.FC<AgentGraphShellProps> = ({
  nodes,
  edges,
  onConnect,
  sidePanel,
  emptyState,
  readOnly = false,
  onDropAgent,
  onNodeEdit,
  onNodeRemove,
  onAddMember,
  onManageEdges,
  onNodeSelect,
  onEdgeSelect,
  agentPaletteSlot,
}) => {
  const { screenToFlowPosition } = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const navigate = useNavigate()

  const resolveContainerOffset = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    return rect ? { left: rect.left, top: rect.top } : { left: 0, top: 0 }
  }

  const handlePaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault()
      const { left, top } = resolveContainerOffset()
      setContextMenu({ x: e.clientX - left, y: e.clientY - top })
    },
    []
  )

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (e, node) => {
      e.preventDefault()
      const { left, top } = resolveContainerOffset()
      const agentHandle = (node.data as AgentNodeData).agentHandle
      setContextMenu({ x: e.clientX - left, y: e.clientY - top, nodeId: node.id, agentHandle })
    },
    []
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      onNodeSelect?.(node.id)
      onEdgeSelect?.(null)
    },
    [onNodeSelect, onEdgeSelect]
  )

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_e, edge) => {
      onEdgeSelect?.(edge.id)
      onNodeSelect?.(null)
    },
    [onEdgeSelect, onNodeSelect]
  )

  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
    onNodeSelect?.(null)
    onEdgeSelect?.(null)
  }, [onNodeSelect, onEdgeSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const agentId = e.dataTransfer.getData('agent-id')
      if (!agentId || !onDropAgent) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      onDropAgent(agentId, position)
    },
    [onDropAgent, screenToFlowPosition]
  )

  const closeMenu = useCallback(() => setContextMenu(null), [])

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div
        ref={containerRef}
        className="relative min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-surface-raised"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Left palette overlay */}
        {agentPaletteSlot}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          panOnScroll
          nodesConnectable={!readOnly}
          nodesDraggable={!readOnly}
          nodesFocusable={!readOnly}
          elementsSelectable={!readOnly}
          proOptions={{ hideAttribution: true }}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="rgba(148, 163, 184, 0.35)"
          />
          <Controls className="!rounded-2xl !border !border-gray-200 !bg-white dark:!border-gray-700 dark:!bg-gray-950" />
        </ReactFlow>

        {nodes.length === 0 && emptyState && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {emptyState.title}
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {emptyState.description}
              </p>
              {emptyState.action && (
                <div className="pointer-events-auto mt-5 flex justify-center">
                  {emptyState.action}
                </div>
              )}
            </div>
          </div>
        )}

        {contextMenu && (
          <AgentCanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            agentHandle={contextMenu.agentHandle}
            onAddMember={() => { onAddMember?.(); closeMenu() }}
            onManageEdges={onManageEdges ? () => { onManageEdges(); closeMenu() } : undefined}
            onEditMember={contextMenu.nodeId && onNodeEdit
              ? () => { onNodeEdit(contextMenu.nodeId!); closeMenu() }
              : undefined}
            onRemoveMember={contextMenu.nodeId && onNodeRemove
              ? () => { onNodeRemove(contextMenu.nodeId!); closeMenu() }
              : undefined}
            onViewAgent={contextMenu.agentHandle
              ? () => { navigate(`/lenser/${contextMenu.agentHandle}/ag/overview`); closeMenu() }
              : undefined}
            onClose={closeMenu}
          />
        )}
      </div>

      <div className="space-y-4">{sidePanel}</div>
    </div>
  )
}

export const AgentGraphShell: React.FC<AgentGraphShellProps> = (props) => (
  <ReactFlowProvider>
    <FlowCanvas {...props} />
  </ReactFlowProvider>
)
