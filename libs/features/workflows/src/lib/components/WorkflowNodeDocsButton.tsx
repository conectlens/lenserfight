import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution'
import { Button, Tooltip } from '@lenserfight/ui/components'
import { BookOpen } from 'lucide-react'
import React, { useState } from 'react'

import { WorkflowNodeDocsPanel } from './WorkflowNodeDocsPanel'

interface WorkflowNodeDocsButtonProps {
  nodeType: string
  /** sm = palette/canvas; md = config panel header */
  size?: 'sm' | 'md'
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * BookOpen icon button that toggles an inline 320px side panel rendering the
 * node's reference docs. Returns null when no catalog entry exists so callers
 * never render a broken affordance.
 *
 * Event propagation is stopped on both mousedown (prevents drag initiation in
 * palette cards) and click (prevents canvas node config panel from opening).
 */
export function WorkflowNodeDocsButton({
  nodeType,
  size = 'sm',
  tooltipPosition = 'top',
  className,
}: WorkflowNodeDocsButtonProps) {
  const entry = getWorkflowNodeCatalogEntry(nodeType)
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  if (!entry) return null

  return (
    <>
      <Tooltip
        content={`${entry.displayName} docs`}
        position={tooltipPosition}
        delayMs={400}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`!h-5 !w-5 !rounded-md !p-0 !text-greyscale-400 hover:!text-sky-500 ${className ?? ''}`}
          aria-label={`View ${entry.displayName} documentation`}
          title={`View ${entry.displayName} documentation`}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            setHasOpened(true)
            setOpen(true)
          }}
        >
          <BookOpen size={size === 'sm' ? 16 : 18} />
        </Button>
      </Tooltip>
      {hasOpened && (
        <WorkflowNodeDocsPanel nodeType={nodeType} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}
