import type { RunUnifiedRow } from '@lenserfight/types'
import { X } from 'lucide-react'
import React from 'react'

import { useRunUnified } from '../hooks/useRunUnified'
import { useWorkspaceControls } from '../hooks/useWorkspaceControls'
import { Button } from '@lenserfight/ui/components'


interface ActiveRunsPanelProps {
  aiLenserId: string
}

const ACTIVE_STATUSES = ['queued', 'running', 'blocked'] as const
type ActiveStatus = (typeof ACTIVE_STATUSES)[number]

function isActiveStatus(s: string): s is ActiveStatus {
  return (ACTIVE_STATUSES as readonly string[]).includes(s)
}

const STATUS_BADGE: Record<ActiveStatus, string> = {
  running:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300',
  queued:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  blocked:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300',
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

const RunRow: React.FC<{
  run: RunUnifiedRow
  onCancel: (runId: string) => void
  isCancelling: boolean
}> = ({ run, onCancel, isCancelling }) => {
  const status = isActiveStatus(run.status) ? run.status : null
  const canCancel = run.status === 'running' || run.status === 'queued'

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
          {run.run_id.slice(0, 8)}
        </span>
        <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
          {run.run_type}
        </span>
        {status && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status]}`}
          >
            {status}
          </span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatDuration(run.duration_seconds)}
        </span>
      </div>
      {canCancel && (
        <Button
          type="button"
          onClick={() => onCancel(run.run_id)}
          disabled={isCancelling}
          title="Cancel run"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-500 dark:hover:border-red-600 dark:hover:text-red-400"
        >
          <X size={13} />
        </Button>
      )}
    </div>
  )
}

export const ActiveRunsPanel: React.FC<ActiveRunsPanelProps> = ({ aiLenserId }) => {
  const { data, isLoading } = useRunUnified(aiLenserId, { limit: 10 })
  const { cancelRun } = useWorkspaceControls(aiLenserId)

  const activeRuns = (data ?? []).filter((r) => isActiveStatus(r.status))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Active Runs
        </h3>
        {activeRuns.length > 0 && (
          <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
            {activeRuns.length}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-12 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            />
          ))
        ) : activeRuns.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No active runs.</p>
        ) : (
          activeRuns.map((run) => (
            <RunRow
              key={run.run_id}
              run={run}
              onCancel={(id) => cancelRun.mutate(id)}
              isCancelling={cancelRun.isPending}
            />
          ))
        )}
      </div>
    </div>
  )
}
