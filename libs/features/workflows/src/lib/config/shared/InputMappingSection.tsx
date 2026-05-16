/**
 * InputMappingSection — shows upstream edge connections for a node.
 *
 * Displays which fields are auto-wired from upstream nodes, helping
 * users understand the data flow into this node.
 */

import { ArrowLeft } from 'lucide-react'
import React from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'

export interface InputMappingSectionProps {
  nodeId: string
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
}

export function InputMappingSection({ nodeId, nodes, edges }: InputMappingSectionProps) {
  const incomingEdges = edges.filter((e) => e.target_node_id === nodeId)
  if (incomingEdges.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-greyscale-500 dark:text-greyscale-400">
        Inputs from upstream
      </p>
      <div className="flex flex-wrap gap-1.5">
        {incomingEdges.map((edge) => {
          const sourceNode = nodes.find((n) => n.id === edge.source_node_id)
          const sourceLabel = sourceNode?.label ?? `Node`
          const outputKey = edge.source_output_key || 'output'
          const targetParam = edge.target_param_label || 'input'

          return (
            <div
              key={edge.id}
              className="flex items-center gap-1 rounded-lg border border-dashed border-greyscale-300 dark:border-greyscale-600 bg-surface-raised px-2 py-1 text-[10px] text-greyscale-500 dark:text-greyscale-400"
            >
              <span className="font-medium text-greyscale-700 dark:text-greyscale-200 truncate max-w-[80px]">
                {targetParam}
              </span>
              <ArrowLeft size={10} className="flex-shrink-0" />
              <span className="truncate max-w-[100px]">
                {sourceLabel}.{outputKey}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
