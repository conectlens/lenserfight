import { Handle, Position, type NodeProps } from '@xyflow/react'
import React from 'react'

export interface AgentNodeData extends Record<string, unknown> {
  label: string
  sublabel?: string
  agentHandle?: string
}

export const AgentCanvasNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as AgentNodeData
  return (
    <div
      className={[
        'min-w-[160px] rounded-2xl border bg-white px-4 py-3 shadow-sm transition dark:bg-gray-900',
        selected
          ? 'border-amber-400 shadow-amber-200/60 dark:border-amber-500 dark:shadow-amber-500/20'
          : 'border-gray-200 dark:border-gray-700',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <p className="max-w-[160px] truncate text-sm font-semibold text-gray-900 dark:text-white">
        {d.label}
      </p>
      {d.sublabel && (
        <p className="mt-0.5 max-w-[160px] truncate text-xs text-gray-500 dark:text-gray-400">
          {d.sublabel}
        </p>
      )}
      {d.agentHandle && (
        <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-amber-600 dark:text-amber-400">
          @{d.agentHandle}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  )
}
