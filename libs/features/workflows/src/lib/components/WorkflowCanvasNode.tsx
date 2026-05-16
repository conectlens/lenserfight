import { Button } from '@lenserfight/ui/components'
import { Handle, Position } from '@xyflow/react'
import { EyeOff, Lock, Pencil, Settings2, Trash2 } from 'lucide-react'
import React from 'react'

import type { NodeProps } from '@xyflow/react'

export interface WorkflowNodeConfig {
  model_id?: string | null
  param_overrides?: Record<string, string>
  node_type?:
    | 'lens'
    | 'image_generate'
    | 'web_search'
    | 'http_request'
    // CN — Logic & Data Foundation
    | 'code'
    | 'json_transform'
    | 'set_variables'
    | 'switch'
    | 'loop_map'
    | 'wait_delay'
    | 'error_catch'
    | 'sub_workflow'
  // Per-node funding source override
  funding_source?: import('@lenserfight/types').FundingSource
  key_ref_id?: string | null
  local_key_id?: string | null
}

export interface WorkflowNodeData {
  label: string
  ordinal: number
  isPersisted: boolean
  lens_id?: string
  lensVisibility?: 'public' | 'private' | 'unlisted'
  lensLenserId?: string
  isLensOwner?: boolean
  config?: WorkflowNodeConfig
  onRemove?: (id: string) => void
  onConfigNode?: (nodeId: string, lensId: string) => void
  onEditLens?: (lensId: string) => void
  [key: string]: unknown
}

/** Visibility-based border + background styles (overridden by selected state). */
const VISIBILITY_BORDER: Record<string, string> = {
  private:  'border-status-red/40 bg-status-red/5 dark:bg-status-red/10',
  unlisted: 'border-greyscale-400/40 bg-greyscale-100/40 dark:bg-greyscale-800/30',
  public:   'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600',
}

const VISIBILITY_ICONS: Record<string, React.ReactNode> = {
  private:  <Lock   size={9} className="text-status-red/70 flex-shrink-0" />,
  unlisted: <EyeOff size={9} className="text-greyscale-400 flex-shrink-0" />,
}

export function WorkflowCanvasNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData
  const { label, ordinal, isPersisted, lens_id, lensVisibility, isLensOwner, onRemove, onConfigNode, onEditLens } = nodeData

  const visibilityIcon = lensVisibility ? (VISIBILITY_ICONS[lensVisibility] ?? null) : null
  const visibilityBorder = VISIBILITY_BORDER[lensVisibility ?? 'public'] ?? VISIBILITY_BORDER['public']

  return (
    <div
      onDoubleClick={() => { if (onConfigNode && lens_id) onConfigNode(id, lens_id) }}
      className={`relative flex items-center gap-2 min-w-[160px] max-w-[240px] rounded-2xl border px-3 py-2.5 shadow-neu-1 transition-colors ${
        selected
          ? 'border-primary-yellow-500 bg-primary-yellow-500/10 ring-2 ring-primary-yellow-500/30'
          : visibilityBorder
      } ${!isPersisted ? 'opacity-60' : ''}`}
    >
      {/* Target handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-500 dark:!bg-greyscale-400 !border-2 !border-surface-base hover:!bg-primary-yellow-500 transition-colors dark:!border-surface-raised"
      />

      {/* Ordinal badge */}
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-greyscale-700 dark:text-greyscale-300 border border-surface-border transition-colors">
        {ordinal + 1}
      </span>

      {/* Visibility icon — colored by type */}
      {visibilityIcon}

      {/* Label */}
      <span className="flex-1 truncate text-xs font-medium text-greyscale-900 dark:text-greyscale-50 leading-tight">
        {label}
      </span>

      {/* Config button — always shown when onConfigNode is provided */}
      {onConfigNode && lens_id && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onConfigNode(id, lens_id)
          }}
          className="!p-0 flex-shrink-0 !text-greyscale-400 dark:!text-greyscale-500 hover:!text-primary-yellow-600 !bg-transparent hover:!bg-transparent transition-colors"
          title="Configure node"
        >
          <Settings2 size={11} />
        </Button>
      )}

      {/* Edit lens source — only for the lens owner */}
      {isLensOwner && onEditLens && lens_id && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onEditLens(lens_id)
          }}
          className="!p-0 flex-shrink-0 !text-greyscale-400 dark:!text-greyscale-500 hover:!text-primary-yellow-600 !bg-transparent hover:!bg-transparent transition-colors"
          title="Edit lens source"
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
          onClick={(e) => {
            e.stopPropagation()
            onRemove(id)
          }}
          className="!p-0 flex-shrink-0 !text-greyscale-400 dark:!text-greyscale-500 hover:!text-status-red !bg-transparent hover:!bg-transparent transition-colors"
          title="Remove node"
        >
          <Trash2 size={11} />
        </Button>
      )}

      {/* Source handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-500 dark:!bg-greyscale-400 !border-2 !border-surface-base hover:!bg-primary-yellow-500 transition-colors dark:!border-surface-raised"
      />
    </div>
  )
}
