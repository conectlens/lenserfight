import React, { useEffect, useState } from 'react'
import { supabase } from '@lenserfight/data/supabase'

// Phase AL — live status badge for an agents.team_runs row.
// Subscribes to Realtime changes on the row so the badge updates without
// a page refresh as the team-run-worker processes the dispatch.

type TeamRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled'

const STATUS_STYLES: Record<TeamRunStatus, string> = {
  queued:    'bg-greyscale-200 text-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-300',
  running:   'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  blocked:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  cancelled: 'bg-greyscale-100 text-greyscale-500 dark:bg-greyscale-800 dark:text-greyscale-400',
}

const STATUS_LABELS: Record<TeamRunStatus, string> = {
  queued:    'Queued',
  running:   'Running',
  completed: 'Completed',
  failed:    'Failed',
  blocked:   'Awaiting approval',
  cancelled: 'Cancelled',
}

export interface TeamRunStatusBadgeProps {
  teamRunId: string
  initialStatus?: TeamRunStatus
  className?: string
}

export function TeamRunStatusBadge({ teamRunId, initialStatus = 'queued', className }: TeamRunStatusBadgeProps) {
  const [status, setStatus] = useState<TeamRunStatus>(initialStatus)

  useEffect(() => {
    const channel = supabase
      .channel(`team-run-status-${teamRunId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'agents',
          table: 'team_runs',
          filter: `id=eq.${teamRunId}`,
        },
        (payload) => {
          const next = (payload.new as { status?: TeamRunStatus })?.status
          if (next) setStatus(next)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [teamRunId])

  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.queued
  const label  = STATUS_LABELS[status] ?? status

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        styles,
        className ?? '',
      ].join(' ')}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden />
      )}
      {label}
    </span>
  )
}
