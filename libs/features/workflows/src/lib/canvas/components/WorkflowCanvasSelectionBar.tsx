import { Button } from '@lenserfight/ui/components'
import { Clipboard, Copy, Scissors, Trash2, X } from 'lucide-react'
import React from 'react'

import { getSelectionCounts, type WorkflowCanvasSelection } from '../selection/workflow-canvas-selection'
import {
  getWorkflowCanvasCommand,
  isWorkflowCanvasCommandEnabled,
  type WorkflowCanvasCommand,
} from '../commands/workflow-canvas-commands'

interface WorkflowCanvasSelectionBarProps {
  selection: WorkflowCanvasSelection
  commands: WorkflowCanvasCommand[]
}

const ACTIONS = [
  { id: 'clipboard.copy', icon: <Copy size={12} /> },
  { id: 'clipboard.cut', icon: <Scissors size={12} /> },
  { id: 'clipboard.duplicate', icon: <Clipboard size={12} /> },
  { id: 'graph.deleteSelection', icon: <Trash2 size={12} /> },
  { id: 'selection.clear', icon: <X size={12} /> },
]

export function WorkflowCanvasSelectionBar({ selection, commands }: WorkflowCanvasSelectionBarProps) {
  const counts = getSelectionCounts(selection)
  if (counts.total === 0) return null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-base px-2 py-1.5 shadow-sm">
      <span className="whitespace-nowrap text-[11px] font-semibold text-greyscale-600 dark:text-greyscale-300">
        {counts.nodes} node{counts.nodes === 1 ? '' : 's'} · {counts.edges} edge{counts.edges === 1 ? '' : 's'}
      </span>
      <span className="h-4 w-px bg-surface-border" />
      {ACTIONS.map((item) => {
        const command = getWorkflowCanvasCommand(commands, item.id)
        if (!command) return null
        const enabled = isWorkflowCanvasCommandEnabled(command)
        return (
          <Button
            key={command.id}
            type="button"
            variant="ghost"
            size="sm"
            disabled={!enabled && !command.disabledReason?.()}
            contextError={!enabled ? command.disabledReason?.() ?? null : null}
            onClick={() => { void command.run() }}
            className={`!h-6 !w-6 !rounded-lg !p-0 ${command.destructive ? 'hover:!text-status-red' : ''}`}
            title={command.label}
          >
            {item.icon}
          </Button>
        )
      })}
    </div>
  )
}
