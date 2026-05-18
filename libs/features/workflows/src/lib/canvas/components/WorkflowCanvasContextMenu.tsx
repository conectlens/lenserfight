import { Button } from '@lenserfight/ui/components'
import {
  BookOpen,
  Clipboard,
  Copy,
  Eye,
  FileCode2,
  Focus,
  GitBranch,
  Keyboard,
  Layout,
  Pencil,
  Play,
  Plus,
  Scissors,
  Settings2,
  SquareStack,
  Trash2,
  Workflow,
  XCircle,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef } from 'react'

import {
  getWorkflowCanvasCommand,
  isWorkflowCanvasCommandEnabled,
  type WorkflowCanvasCommand,
} from '../commands/workflow-canvas-commands'

export type WorkflowCanvasContextMenuTarget = 'canvas' | 'node' | 'edge' | 'selection'

interface WorkflowCanvasContextMenuProps {
  x: number
  y: number
  target: WorkflowCanvasContextMenuTarget
  commands: WorkflowCanvasCommand[]
  onClose: () => void
}

const MENU_COMMANDS: Record<WorkflowCanvasContextMenuTarget, Array<{ id: string; icon: React.ReactNode }>> = {
  canvas: [
    { id: 'canvas.addNode', icon: <Plus size={14} /> },
    { id: 'clipboard.paste', icon: <Clipboard size={14} /> },
    { id: 'selection.selectAll', icon: <SquareStack size={14} /> },
    { id: 'viewport.fitView', icon: <Focus size={14} /> },
    { id: 'layout.autoLayout', icon: <Layout size={14} /> },
    { id: 'canvas.createNote', icon: <FileCode2 size={14} /> },
    { id: 'canvas.createGroup', icon: <Workflow size={14} /> },
    { id: 'commandPalette.open', icon: <Keyboard size={14} /> },
  ],
  node: [
    { id: 'node.configure', icon: <Settings2 size={14} /> },
    { id: 'clipboard.duplicate', icon: <Copy size={14} /> },
    { id: 'clipboard.copy', icon: <Copy size={14} /> },
    { id: 'clipboard.cut', icon: <Scissors size={14} /> },
    { id: 'node.rename', icon: <Pencil size={14} /> },
    { id: 'node.toggleDisabled', icon: <XCircle size={14} /> },
    { id: 'node.viewDocs', icon: <BookOpen size={14} /> },
    { id: 'node.run', icon: <Play size={14} /> },
    { id: 'node.addConnected', icon: <Plus size={14} /> },
    { id: 'graph.deleteSelection', icon: <Trash2 size={14} /> },
  ],
  edge: [
    { id: 'edge.delete', icon: <Trash2 size={14} /> },
    { id: 'edge.inspectCompatibility', icon: <Eye size={14} /> },
    { id: 'edge.changeMode', icon: <GitBranch size={14} /> },
    { id: 'edge.viewContract', icon: <FileCode2 size={14} /> },
  ],
  selection: [
    { id: 'clipboard.copy', icon: <Copy size={14} /> },
    { id: 'clipboard.cut', icon: <Scissors size={14} /> },
    { id: 'clipboard.duplicate', icon: <Clipboard size={14} /> },
    { id: 'layout.autoLayout', icon: <Layout size={14} /> },
    { id: 'graph.deleteSelection', icon: <Trash2 size={14} /> },
  ],
}

export function WorkflowCanvasContextMenu({
  x,
  y,
  target,
  commands,
  onClose,
}: WorkflowCanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const handlePointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handlePointer)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handlePointer)
    }
  }, [onClose])

  const items = useMemo(
    () =>
      MENU_COMMANDS[target]
        .map((item) => {
          const command = getWorkflowCanvasCommand(commands, item.id)
          if (!command) return null
          const enabled = isWorkflowCanvasCommandEnabled(command)
          const reason = enabled ? null : command.disabledReason?.() ?? null
          if (!enabled && !reason) return null
          return { command, enabled, reason, icon: item.icon }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [commands, target],
  )

  if (items.length === 0) return null

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="pointer-events-auto absolute z-50 min-w-[220px] overflow-hidden rounded-xl border border-surface-border bg-surface-base py-1 shadow-lg"
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map(({ command, enabled, reason, icon }) => (
        <Button
          key={command.id}
          type="button"
          variant="ghost"
          size="sm"
          disabled={!enabled && !reason}
          contextError={!enabled ? reason : null}
          onClick={() => {
            if (!enabled) return
            void command.run()
            onClose()
          }}
          className={`flex w-full justify-start !rounded-none !px-3 !py-2 text-left ${
            command.destructive ? '!text-status-red hover:!text-status-red' : ''
          }`}
          title={reason ?? command.label}
        >
          {icon}
          <span className="flex-1 truncate">{command.label}</span>
        </Button>
      ))}
    </div>
  )
}
