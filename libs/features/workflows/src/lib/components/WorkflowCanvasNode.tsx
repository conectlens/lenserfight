import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import React from 'react'

export interface WorkflowNodeData {
  label: string
  ordinal: number
  isPersisted: boolean
  onRemove?: (id: string) => void
  [key: string]: unknown
}

export function WorkflowCanvasNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData
  const { label, ordinal, isPersisted, onRemove } = nodeData

  return (
    <div
      className={`relative flex items-center gap-2.5 min-w-[160px] max-w-[220px] rounded-2xl border bg-surface-raised px-3 py-2.5 shadow-neu-1 transition-colors ${
        selected
          ? 'border-status-blue ring-2 ring-status-blue/20'
          : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
      } ${!isPersisted ? 'border-dashed opacity-80' : ''}`}
    >
      {/* Target handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-300 !border-2 !border-surface-base hover:!bg-status-blue transition-colors dark:!border-surface-raised"
      />

      {/* Ordinal badge */}
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-base text-[10px] font-bold text-greyscale-500 border border-surface-border">
        {ordinal + 1}
      </span>

      {/* Label */}
      <span className="flex-1 truncate text-xs font-medium text-greyscale-900 dark:text-greyscale-50 leading-tight">
        {label}
      </span>

      {/* Remove button — only for unsaved/removable nodes */}
      {onRemove && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation()
            onRemove(id)
          }}
          className="flex-shrink-0 text-greyscale-300 hover:text-status-red transition-colors"
          title="Remove node"
        >
          <Trash2 size={11} />
        </button>
      )}

      {/* Source handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-300 !border-2 !border-surface-base hover:!bg-status-blue transition-colors dark:!border-surface-raised"
      />
    </div>
  )
}
