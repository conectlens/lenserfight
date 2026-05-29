import type { ExecutionLifecycle } from '@lenserfight/api/contracts'
import { mapToLifecycle } from '@lenserfight/api/contracts'
import React from 'react'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'

interface ExecutionStatusBadgeProps {
  lifecycle?: ExecutionLifecycle
  /** @deprecated Prefer lifecycle={mapToLifecycle(raw, source)} at call sites. */
  status?: string
  retryCount?: number
}

const STATUS_CONFIG: Record<
  ExecutionLifecycle,
  { icon: React.ReactNode; label: string; classes: string }
> = {
  pending: {
    icon: <Clock size={11} />,
    label: 'Pending',
    classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
  queued: {
    icon: <Clock size={11} />,
    label: 'Queued',
    classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
  claimed: {
    icon: <Loader2 size={11} className="animate-spin" />,
    label: 'Claimed',
    classes: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  running: {
    icon: <Loader2 size={11} className="animate-spin" />,
    label: 'Running',
    classes: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  completed: {
    icon: <CheckCircle2 size={11} />,
    label: 'Done',
    classes: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  failed: {
    icon: <XCircle size={11} />,
    label: 'Failed',
    classes: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  cancelled: {
    icon: <XCircle size={11} />,
    label: 'Cancelled',
    classes: 'bg-surface-interactive text-surface-text-muted',
  },
}

export function ExecutionStatusBadge({ lifecycle, status, retryCount }: ExecutionStatusBadgeProps) {
  const resolvedLifecycle = lifecycle ?? mapToLifecycle(status, 'battle_job')
  const cfg = STATUS_CONFIG[resolvedLifecycle]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.icon}
      {cfg.label}
      {retryCount != null && retryCount > 0 && (
        <span className="opacity-70">(retry {retryCount})</span>
      )}
    </span>
  )
}
