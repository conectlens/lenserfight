import { Dialog } from '@lenserfight/ui/overlays'
import { Keyboard } from 'lucide-react'
import React from 'react'

import type { WorkflowCanvasCommand } from '../commands/workflow-canvas-commands'
import { shortcutLabel } from '../keyboard/workflow-canvas-shortcuts'

interface WorkflowCanvasShortcutHelpProps {
  open: boolean
  commands: WorkflowCanvasCommand[]
  onClose: () => void
}

export function WorkflowCanvasShortcutHelp({ open, commands, onClose }: WorkflowCanvasShortcutHelpProps) {
  const shortcutCommands = commands
    .filter((command) => command.shortcut && command.id !== 'graph.deleteSelection.backspace')
    .sort((a, b) => a.scope.localeCompare(b.scope) || a.label.localeCompare(b.label))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      icon={<Keyboard size={18} />}
      maxWidth="max-w-lg"
    >
      <div className="grid gap-2">
        {shortcutCommands.map((command) => (
          <div
            key={command.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-surface-border bg-surface-raised px-3 py-2"
          >
            <span className="text-sm font-medium text-greyscale-800 dark:text-greyscale-100">
              {command.label}
            </span>
            <kbd className="rounded-md border border-surface-border bg-surface-base px-1.5 py-0.5 text-[11px] font-semibold text-greyscale-500">
              {command.shortcut ? shortcutLabel(command.shortcut) : ''}
            </kbd>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
