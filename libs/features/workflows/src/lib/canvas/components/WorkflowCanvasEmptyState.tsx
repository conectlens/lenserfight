import { Keyboard, Zap } from 'lucide-react'
import React from 'react'

interface WorkflowCanvasEmptyStateProps {
  onAddNode?: () => void
  onOpenShortcuts?: () => void
}

export function WorkflowCanvasEmptyState({ onAddNode, onOpenShortcuts }: WorkflowCanvasEmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto max-w-sm rounded-xl border border-surface-border bg-surface-base/90 px-5 py-4 text-center shadow-sm backdrop-blur">
        <Zap size={32} className="mx-auto text-emerald-500" />
        <h2 className="mt-2 text-sm font-bold text-greyscale-900 dark:text-greyscale-50">
          Choose how this workflow starts
        </h2>
        <p className="mt-1 text-xs leading-5 text-greyscale-500">
          Add a trigger node — <span className="font-medium text-greyscale-700 dark:text-greyscale-300">Manual</span>,{' '}
          <span className="font-medium text-greyscale-700 dark:text-greyscale-300">Webhook</span>,{' '}
          <span className="font-medium text-greyscale-700 dark:text-greyscale-300">Schedule</span>,{' '}
          <span className="font-medium text-greyscale-700 dark:text-greyscale-300">Event</span>, or{' '}
          <span className="font-medium text-greyscale-700 dark:text-greyscale-300">Form</span>{' '}
          — to define where data enters the workflow.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {onAddNode && (
            <button
              type="button"
              onClick={onAddNode}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              <Zap size={12} />
              Add Trigger
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
