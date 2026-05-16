/**
 * ConfigPanelShell — reusable aside wrapper for all runner config panels.
 *
 * Provides the common chrome: header (node label + type), scrollable body,
 * and close button. Individual runner forms render into the children slot.
 */

import { Button } from '@lenserfight/ui/components'
import { X } from 'lucide-react'
import React from 'react'

export interface ConfigPanelShellProps {
  nodeLabel: string
  nodeType: string
  onClose: () => void
  children: React.ReactNode
}

export function ConfigPanelShell({
  nodeLabel,
  nodeType,
  onClose,
  children,
}: ConfigPanelShellProps) {
  return (
    <aside className="flex flex-col w-100 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            Configure: {nodeLabel}
          </p>
          <p className="text-[11px] text-greyscale-400 mt-0.5 capitalize">
            {nodeType.replace(/_/g, ' ')} node
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="!p-1 !h-6 !w-6 text-greyscale-400 hover:text-greyscale-700 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>
    </aside>
  )
}
