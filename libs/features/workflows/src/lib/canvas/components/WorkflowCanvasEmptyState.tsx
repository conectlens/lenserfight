import { GitBranch, Keyboard, Plus } from 'lucide-react'
import React from 'react'

interface WorkflowCanvasEmptyStateProps {
  onAddNode?: () => void
  onOpenShortcuts?: () => void
}

export function WorkflowCanvasEmptyState({ onAddNode, onOpenShortcuts }: WorkflowCanvasEmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto max-w-sm rounded-xl border border-surface-border bg-surface-base/90 px-5 py-4 text-center shadow-sm backdrop-blur">
        <GitBranch size={32} className="mx-auto text-primary-yellow-600" />
        <h2 className="mt-2 text-sm font-bold text-greyscale-900 dark:text-greyscale-50">
          Start a workflow
        </h2>
        <p className="mt-1 text-xs leading-5 text-greyscale-500">
          Drag a lens or utility node from the sidebar, then connect nodes from left to right.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {onAddNode && (
            <button
              type="button"
              onClick={onAddNode}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-raised px-2.5 text-xs font-semibold text-greyscale-700 hover:text-greyscale-900 dark:text-greyscale-200"
            >
              <Plus size={12} />
              Add node
            </button>
          )}
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-raised px-2.5 text-xs font-semibold text-greyscale-700 hover:text-greyscale-900 dark:text-greyscale-200"
            >
              <Keyboard size={12} />
              Shortcuts
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
