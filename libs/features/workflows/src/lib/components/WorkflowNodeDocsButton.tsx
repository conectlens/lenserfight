import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution'
import { useLocale } from '@lenserfight/shared/i18n-locale'
import { Button, Tooltip } from '@lenserfight/ui/components'
import { BookOpen } from 'lucide-react'
import React from 'react'

import { getWorkflowNodeDocsHref } from '../utils/workflow-node-docs'

interface WorkflowNodeDocsButtonProps {
  nodeType: string
  /** sm = 11 px icon for palette/canvas; md = 12 px for config panel header */
  size?: 'sm' | 'md'
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * A small BookOpen icon button that opens the node's documentation page in a
 * new tab. Returns null when no published docs page is available so callers
 * never render a broken link.
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
  const { locale } = useLocale()
  const entry = getWorkflowNodeCatalogEntry(nodeType)
  const href = entry ? getWorkflowNodeDocsHref(entry.docsPath, locale) : null

  if (!href) return null

  return (
    <Tooltip
      content={`${entry!.displayName} docs`}
      position={tooltipPosition}
      delayMs={400}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`!h-5 !w-5 !rounded-md !p-0 !text-greyscale-400 hover:!text-sky-500 ${className ?? ''}`}
        aria-label={`View ${entry!.displayName} documentation`}
        title={`View ${entry!.displayName} documentation`}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          e.preventDefault()
          window.open(href, '_blank', 'noreferrer')
        }}
      >
        <BookOpen size={size === 'sm' ? 11 : 12} />
      </Button>
    </Tooltip>
  )
}
