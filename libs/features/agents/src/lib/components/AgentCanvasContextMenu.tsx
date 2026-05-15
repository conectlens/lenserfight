import { ExternalLink, Network, Pencil, Trash2, UserPlus } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import { Button } from '@lenserfight/ui/components'


interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface AgentCanvasContextMenuProps {
  x: number
  y: number
  /** When defined, the menu is anchored to a node; otherwise it's a pane menu. */
  nodeId?: string
  /** Handle of the agent on the node — enables the "View agent" menu item. */
  agentHandle?: string
  onAddMember: () => void
  onManageEdges?: () => void
  onEditMember?: () => void
  onRemoveMember?: () => void
  onViewAgent?: () => void
  onClose: () => void
}

export const AgentCanvasContextMenu: React.FC<AgentCanvasContextMenuProps> = ({
  x,
  y,
  nodeId,
  onAddMember,
  onManageEdges,
  onEditMember,
  onRemoveMember,
  onViewAgent,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const items: MenuItem[] = nodeId
    ? [
        ...(onViewAgent ? [{ label: 'View agent', icon: <ExternalLink size={14} />, onClick: onViewAgent }] : []),
        ...(onEditMember ? [{ label: 'Edit member', icon: <Pencil size={14} />, onClick: onEditMember }] : []),
        ...(onRemoveMember
          ? [{ label: 'Remove member', icon: <Trash2 size={14} />, onClick: onRemoveMember, variant: 'destructive' as const }]
          : []),
      ]
    : [
        { label: 'Add member here', icon: <UserPlus size={14} />, onClick: onAddMember },
        ...(onManageEdges
          ? [{ label: 'Manage edges', icon: <Network size={14} />, onClick: onManageEdges }]
          : []),
      ]

  if (items.length === 0) return null

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="pointer-events-auto absolute z-50 min-w-[168px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <Button
          key={idx}
          type="button"
          onClick={() => { item.onClick(); onClose() }}
          className={[
            'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50 dark:hover:bg-gray-800',
            item.variant === 'destructive'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-700 dark:text-gray-200',
          ].join(' ')}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>
  )
}
