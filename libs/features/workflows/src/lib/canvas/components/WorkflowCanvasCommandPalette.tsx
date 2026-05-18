import { Dialog } from '@lenserfight/ui/overlays'
import { Command, Search } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import {
  isWorkflowCanvasCommandEnabled,
  type WorkflowCanvasCommand,
} from '../commands/workflow-canvas-commands'
import { shortcutLabel } from '../keyboard/workflow-canvas-shortcuts'

interface WorkflowCanvasCommandPaletteProps {
  open: boolean
  commands: WorkflowCanvasCommand[]
  onClose: () => void
}

export function WorkflowCanvasCommandPalette({
  open,
  commands,
  onClose,
}: WorkflowCanvasCommandPaletteProps) {
  const [query, setQuery] = useState('')
  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return commands
      .filter((command) => command.id !== 'graph.deleteSelection.backspace')
      .filter((command) => {
        if (!normalized) return true
        return `${command.label} ${command.id} ${command.scope}`.toLowerCase().includes(normalized)
      })
      .slice(0, 24)
  }, [commands, query])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Command palette"
      icon={<Command size={18} />}
      maxWidth="max-w-xl"
      panelClassName="!p-0"
    >
      <div className="border-b border-surface-border px-4 py-3">
        <label className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2">
          <Search size={14} className="text-greyscale-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands"
            className="min-w-0 flex-1 bg-transparent text-sm text-greyscale-900 outline-none placeholder:text-greyscale-400 dark:text-greyscale-50"
            autoFocus
          />
        </label>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {visibleCommands.map((command) => {
          const enabled = isWorkflowCanvasCommandEnabled(command)
          const reason = enabled ? null : command.disabledReason?.() ?? null
          return (
            <button
              key={command.id}
              type="button"
              disabled={!enabled}
              title={reason ?? command.label}
              onClick={() => {
                void command.run()
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-greyscale-800 dark:text-greyscale-100">
                  {command.label}
                </span>
                <span className="block truncate text-[11px] text-greyscale-400">
                  {reason ?? command.scope}
                </span>
              </span>
              {command.shortcut && (
                <kbd className="rounded-md border border-surface-border bg-surface-base px-1.5 py-0.5 text-[10px] font-semibold text-greyscale-500">
                  {shortcutLabel(command.shortcut)}
                </kbd>
              )}
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
