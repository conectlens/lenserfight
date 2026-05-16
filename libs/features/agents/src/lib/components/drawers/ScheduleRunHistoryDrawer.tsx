import { workflowsService } from '@lenserfight/data/repositories'
import type { WorkflowScheduleRunHistoryRecord } from '@lenserfight/types'
import { Drawer } from '@lenserfight/ui/overlays'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import React from 'react'

import { formatDateTime } from '../sections/_shared'
import { DrawerDocsLink } from './DrawerDocsLink'

interface Props {
  open: boolean
  onClose: () => void
  scheduleId: string | null
  scheduleName: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400',
  queued:    'border-primary-yellow-200 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300',
  running:   'border-blue-200 text-blue-700 dark:border-blue-500/30 dark:text-blue-300',
  completed: 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
  failed:    'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
  cancelled: 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.pending}`}
    >
      {status}
    </span>
  )
}

function RunRow({ run }: { run: WorkflowScheduleRunHistoryRecord }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <CalendarClock size={12} className="shrink-0 text-gray-400" />
        <span className="font-mono text-xs text-gray-700 dark:text-gray-200">
          {run.scheduled_for}
        </span>
        <StatusPill status={run.status} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-4 text-[11px] text-gray-500 dark:text-gray-400">
        {run.started_at && (
          <span>Started: {formatDateTime(run.started_at)}</span>
        )}
        {run.completed_at && (
          <span>Finished: {formatDateTime(run.completed_at)}</span>
        )}
      </div>
      {run.error_message && (
        <p className="mt-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {run.error_message}
        </p>
      )}
    </div>
  )
}

export const ScheduleRunHistoryDrawer: React.FC<Props> = ({
  open,
  onClose,
  scheduleId,
  scheduleName,
}) => {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['schedule-history', scheduleId],
    queryFn: () => workflowsService.getScheduleHistory(scheduleId!),
    enabled: open && !!scheduleId,
    staleTime: 30_000,
  })

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Run history — ${scheduleName}`}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/schedule-run-history"
          tip="Recent dispatch attempts for this schedule. 'dispatch_failed' means the gateway couldn't enqueue the run; 'failed' means it ran but the workflow errored. Check Logs for root cause."
        />
      }
    >
      <div className="space-y-3 p-4">
        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        )}
        {!isLoading && runs.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No runs yet.</p>
        )}
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </div>
    </Drawer>
  )
}
