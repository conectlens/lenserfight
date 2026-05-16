import { Button } from '@lenserfight/ui/components'
import { HelpCircle, Columns3, Command, Focus, Redo2, Save, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import React from 'react'

import {
  getWorkflowCanvasCommand,
  isWorkflowCanvasCommandEnabled,
  type WorkflowCanvasCommand,
} from '../commands/workflow-canvas-commands'

interface WorkflowCanvasToolbarProps {
  commands: WorkflowCanvasCommand[]
}

const TOOLBAR_COMMANDS = [
  { id: 'history.undo', icon: <Undo2 size={13} /> },
  { id: 'history.redo', icon: <Redo2 size={13} /> },
  { id: 'workflow.save', icon: <Save size={13} /> },
  { id: 'viewport.zoomIn', icon: <ZoomIn size={13} /> },
  { id: 'viewport.zoomOut', icon: <ZoomOut size={13} /> },
  { id: 'viewport.fitView', icon: <Focus size={13} /> },
  { id: 'layout.autoLayout', icon: <Columns3 size={13} /> },
  { id: 'commandPalette.open', icon: <Command size={13} /> },
  { id: 'help.shortcuts', icon: <HelpCircle size={13} /> },
]

export function WorkflowCanvasToolbar({ commands }: WorkflowCanvasToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface-base p-1 shadow-sm">
      {TOOLBAR_COMMANDS.map((item) => {
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
            className="!h-7 !w-7 !rounded-lg !p-0"
            title={command.label}
          >
            {item.icon}
          </Button>
        )
      })}
    </div>
  )
}
