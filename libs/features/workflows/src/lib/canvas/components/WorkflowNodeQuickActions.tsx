import { Button } from '@lenserfight/ui/components'
import { Copy, Pencil, Settings2, Trash2 } from 'lucide-react'
import React from 'react'

interface WorkflowNodeQuickActionsProps {
  canConfigure?: boolean
  canEditLens?: boolean
  canDuplicate?: boolean
  canDelete?: boolean
  onConfigure?: () => void
  onEditLens?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

export function WorkflowNodeQuickActions({
  canConfigure,
  canEditLens,
  canDuplicate,
  canDelete,
  onConfigure,
  onEditLens,
  onDuplicate,
  onDelete,
}: WorkflowNodeQuickActionsProps) {
  return (
    <div className="nodrag nopan flex items-center gap-0.5">
      {canConfigure && onConfigure && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onConfigure()
          }}
          className="!h-5 !w-5 !rounded-md !p-0 !text-greyscale-400 hover:!text-primary-yellow-600"
          title="Configure node"
        >
          <Settings2 size={11} />
        </Button>
      )}
      {canDuplicate && onDuplicate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onDuplicate()
          }}
          className="!h-5 !w-5 !rounded-md !p-0 !text-greyscale-400 hover:!text-primary-yellow-600"
          title="Duplicate node"
        >
          <Copy size={11} />
        </Button>
      )}
      {canEditLens && onEditLens && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onEditLens()
          }}
          className="!h-5 !w-5 !rounded-md !p-0 !text-greyscale-400 hover:!text-primary-yellow-600"
          title="Edit lens source"
        >
          <Pencil size={11} />
        </Button>
      )}
      {canDelete && onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          className="!h-5 !w-5 !rounded-md !p-0 !text-greyscale-400 hover:!text-status-red"
          title="Remove node"
        >
          <Trash2 size={11} />
        </Button>
      )}
    </div>
  )
}
