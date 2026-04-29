import '@xyflow/react/dist/style.css'

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from '@xyflow/react'
import React from 'react'

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
}

export const AgentGraphShell: React.FC<AgentGraphShellProps> = ({
  nodes,
  edges,
  onConnect,
  sidePanel,
  emptyState,
  readOnly = false,
}) => (
  <ReactFlowProvider>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          panOnScroll
          nodesConnectable={!readOnly}
          nodesDraggable={!readOnly}
          nodesFocusable={!readOnly}
          elementsSelectable={!readOnly}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="rgba(148, 163, 184, 0.35)"
          />
          <MiniMap
            pannable
            zoomable
            className="!rounded-2xl !border !border-gray-200 !bg-white/90 dark:!border-gray-700 dark:!bg-gray-950/90"
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
      </div>

      <div className="space-y-4">{sidePanel}</div>
    </div>
  </ReactFlowProvider>
)
