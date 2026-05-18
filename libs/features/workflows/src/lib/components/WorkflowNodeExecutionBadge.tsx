/**
 * WorkflowNodeExecutionBadge
 *
 * Compact corner badge shown on a WorkflowCanvasNode during and after execution.
 * Absolute-positioned at the top-right corner of the node; pointer-events-none
 * so it doesn't interfere with node selection or drag.
 *
 * Provides an aria-label and title for accessibility — status is never
 * communicated by color alone.
 */
import React from 'react'

import {
  getStatusIcon,
  isSpinningStatus,
  STATUS_LABELS,
} from '../execution/workflowNodeExecutionStatus'

import type { NodeStatus } from '../execution/workflowNodeExecutionStatus'

interface WorkflowNodeExecutionBadgeProps {
  status: NodeStatus
  /** When true, appends " (dry run)" to the accessible label. */
  isDryRun?: boolean
}

export function WorkflowNodeExecutionBadge({
  status,
  isDryRun,
}: WorkflowNodeExecutionBadgeProps) {
  const label = STATUS_LABELS[status] + (isDryRun ? ' (dry run)' : '')
  const spinning = isSpinningStatus(status)

  // Badge background tint by status family
  const tint =
    status === 'completed'
      ? 'bg-status-green/10 border-status-green/30'
      : status === 'failed' ||
          status === 'cancelled' ||
          status === 'timed_out' ||
          status === 'blocked' ||
          status === 'invalidated'
        ? 'bg-status-red/10 border-status-red/30'
        : spinning
          ? 'bg-primary-yellow-500/10 border-primary-yellow-500/30'
          : 'bg-surface-base border-surface-border'

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className={`pointer-events-none absolute -top-2 -right-2 z-10 flex items-center justify-center rounded-full border shadow-sm ${tint}`}
      style={{ width: 18, height: 18 }}
    >
      {getStatusIcon(status, 9)}
    </div>
  )
}
