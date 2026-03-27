import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Button } from '@lenserfight/ui/components'
import { Pencil, Trash2 } from 'lucide-react'
import React from 'react'

export interface WorkflowNodeData {
  label: string
  ordinal: number
  isPersisted: boolean
  lens_id?: string
  onRemove?: (id: string) => void
  onEdit?: (lensId: string) => void
  [key: string]: unknown
}

export function WorkflowCanvasNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData
  const { label, ordinal, isPersisted, lens_id, onRemove, onEdit } = nodeData

  return (
    <div
      onClick={() => { if (onEdit && lens_id) onEdit(lens_id) }}
      onDoubleClick={() => { if (onEdit && lens_id) onEdit(lens_id) }}
      className={`relative flex items-center gap-2.5 min-w-[160px] max-w-[220px] rounded-2xl border bg-surface-raised px-3 py-2.5 shadow-neu-1 transition-colors ${
        selected
          ? 'border-primary-yellow-500 ring-2 ring-primary-yellow-500/20'
          : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
      } ${!isPersisted ? 'border-dashed opacity-80' : ''}`}
    >
      {/* Target handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-300 !border-2 !border-surface-base hover:!bg-primary-yellow-500 transition-colors dark:!border-surface-raised"
      />

      {/* Ordinal badge */}
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-base text-[10px] font-bold text-greyscale-500 border border-surface-border">
        {ordinal + 1}
      </span>

      {/* Label */}
      <span className="flex-1 truncate text-xs font-medium text-greyscale-900 dark:text-greyscale-50 leading-tight">
        {label}
      </span>

      {/* Edit button */}
      {onEdit && lens_id && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            onEdit(lens_id)
          }}
          className="!p-0 flex-shrink-0 !text-greyscale-300 hover:!text-primary-yellow-600 !bg-transparent hover:!bg-transparent"
          title="Edit lens"
        >
          <Pencil size={11} />
        </Button>
      )}

      {/* Remove button */}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            onRemove(id)
          }}
          className="!p-0 flex-shrink-0 !text-greyscale-300 hover:!text-status-red !bg-transparent hover:!bg-transparent"
          title="Remove node"
        >
          <Trash2 size={11} />
        </Button>
      )}

      {/* Source handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-300 !border-2 !border-surface-base hover:!bg-primary-yellow-500 transition-colors dark:!border-surface-raised"
      />
    </div>
  )
}
