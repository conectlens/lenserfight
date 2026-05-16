/**
 * Shared execution status helpers for Workflow Studio.
 *
 * These are extracted from WorkflowProgressView so both the canvas node
 * (WorkflowCanvasNode) and the progress panel (WorkflowProgressView) can use
 * the same icon, label, and styling logic without duplicating it.
 */
import {
  Ban,
  CheckCircle,
  Clock,
  Hourglass,
  Loader,
  RotateCw,
  ShieldAlert,
  SkipForward,
  TimerOff,
  XCircle,
} from 'lucide-react'
import React from 'react'

import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'

export type NodeStatus = WorkflowNodeResultRecord['status']

// ── Icon factory ─────────────────────────────────────────────────────────────

/**
 * Returns the Lucide icon element for a given node status.
 * `size` defaults to 14 (progress panel) but can be passed as 9 for badges.
 */
export function getStatusIcon(status: NodeStatus, size = 14): React.ReactNode {
  switch (status) {
    case 'pending':
      return React.createElement(Clock, { size, className: 'text-greyscale-400' })
    case 'awaiting_dependency':
      return React.createElement(Hourglass, { size, className: 'text-greyscale-400' })
    case 'queued':
      return React.createElement(Clock, { size, className: 'text-greyscale-500' })
    case 'running':
      return React.createElement(Loader, { size, className: 'text-primary-yellow-600 animate-spin' })
    case 'streaming':
      return React.createElement(Loader, { size, className: 'text-primary-yellow-600 animate-spin' })
    case 'retrying':
      return React.createElement(RotateCw, { size, className: 'text-primary-yellow-600 animate-spin' })
    case 'completed':
      return React.createElement(CheckCircle, { size, className: 'text-status-green' })
    case 'failed':
      return React.createElement(XCircle, { size, className: 'text-status-red' })
    case 'cancelled':
      return React.createElement(XCircle, { size, className: 'text-status-red' })
    case 'skipped':
      return React.createElement(SkipForward, { size, className: 'text-greyscale-500' })
    case 'timed_out':
      return React.createElement(TimerOff, { size, className: 'text-status-red' })
    case 'blocked':
      return React.createElement(Ban, { size, className: 'text-status-red' })
    case 'invalidated':
      return React.createElement(ShieldAlert, { size, className: 'text-status-red' })
    default:
      return React.createElement(Clock, { size, className: 'text-greyscale-400' })
  }
}

// ── Color maps ───────────────────────────────────────────────────────────────

/** Border + background tint for the progress panel card per status. */
export const STATUS_COLORS: Record<NodeStatus, string> = {
  pending:              'border-surface-border bg-surface-base',
  awaiting_dependency:  'border-surface-border bg-surface-base',
  queued:               'border-surface-border bg-surface-base',
  running:              'border-primary-yellow-500 bg-primary-yellow-500/5',
  streaming:            'border-primary-yellow-500 bg-primary-yellow-500/5',
  retrying:             'border-primary-yellow-500/60 bg-primary-yellow-500/5',
  completed:            'border-status-green bg-status-green/5',
  failed:               'border-status-red bg-status-red/5',
  cancelled:            'border-status-red bg-status-red/5',
  skipped:              'border-surface-border bg-surface-base opacity-70',
  timed_out:            'border-status-red bg-status-red/5',
  blocked:              'border-status-red bg-status-red/5',
  invalidated:          'border-status-red bg-status-red/5',
}

/** Human-readable label per status. */
export const STATUS_LABELS: Record<NodeStatus, string> = {
  pending:              'Pending',
  awaiting_dependency:  'Awaiting',
  queued:               'Queued',
  running:              'Running',
  streaming:            'Streaming',
  retrying:             'Retrying',
  completed:            'Completed',
  failed:               'Failed',
  cancelled:            'Canceled',
  skipped:              'Skipped',
  timed_out:            'Timed out',
  blocked:              'Blocked',
  invalidated:          'Invalidated',
}

// ── Canvas ring helper ────────────────────────────────────────────────────────

/**
 * Returns a Tailwind `ring-*` class string that visually indicates the
 * execution status of a canvas node.
 *
 * Uses `ring-*` (not `border-*`) so the indicator layers *outside* the
 * existing category/visibility border and both are visible simultaneously.
 * Returns an empty string when status is null/undefined (no run active).
 */
export function getNodeExecutionRingClassName(status: NodeStatus | null | undefined): string {
  switch (status) {
    case 'running':
    case 'streaming':
    case 'retrying':
      return 'ring-2 ring-primary-yellow-500/70'
    case 'completed':
      return 'ring-2 ring-status-green/70'
    case 'failed':
    case 'cancelled':
    case 'timed_out':
    case 'blocked':
    case 'invalidated':
      return 'ring-2 ring-status-red/70'
    case 'queued':
    case 'awaiting_dependency':
    case 'pending':
      return 'ring-1 ring-greyscale-400/30'
    case 'skipped':
      return 'ring-1 ring-greyscale-300/30 opacity-60'
    default:
      return ''
  }
}

// ── State predicates ─────────────────────────────────────────────────────────

/** Returns true for statuses that should show a spinning loader. */
export function isSpinningStatus(status: NodeStatus | null | undefined): boolean {
  return status === 'running' || status === 'streaming' || status === 'retrying'
}
