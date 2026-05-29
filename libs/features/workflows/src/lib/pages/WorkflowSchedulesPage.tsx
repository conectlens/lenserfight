import type { WorkflowScheduleRecord } from '@lenserfight/types'
import { Button, EmptyState, PageHeader } from '@lenserfight/ui/components'
import { CalendarClock, Pause, Play, Save } from 'lucide-react'
import React, { useState } from 'react'

import { useUpsertWorkflowSchedule, useWorkflowSchedules } from '../hooks/useWorkflowSchedules'

function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  return parts.every((part) => /^[\d*,/\-]+$/.test(part))
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function statusClass(status: string | null): string {
  if (status === 'dispatched') return 'text-emerald-600 bg-emerald-500/10'
  if (status === 'paused') return 'text-greyscale-500 bg-surface-raised'
  if (!status) return 'text-greyscale-500 bg-surface-raised'
  return 'text-red-600 bg-red-500/10'
}

export function WorkflowSchedulesPage() {
  const { data: schedules = [], isLoading } = useWorkflowSchedules(undefined)
  const upsert = useUpsertWorkflowSchedule()
  const [draftCron, setDraftCron] = useState<Record<string, string>>({})

  const updateSchedule = (schedule: WorkflowScheduleRecord, patch: Partial<WorkflowScheduleRecord>) => {
    upsert.mutate({
      workflow_id: schedule.workflow_id,
      schedule_id: schedule.id,
      cron_expr: patch.cron_expr ?? schedule.cron_expr,
      timezone: patch.timezone ?? schedule.timezone,
      is_active: patch.is_active ?? schedule.is_active,
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Workflow Schedules"
        description="Review cron schedules, upcoming fires, and last dispatch status."
        icon={<CalendarClock size={20} />}
      />

      {isLoading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={CalendarClock}
            title="No workflow schedules."
            description="Create a schedule from a workflow builder to see it here."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-greyscale-500">
              <tr>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Cron</th>
                <th className="px-4 py-3">Timezone</th>
                <th className="px-4 py-3">Next fire</th>
                <th className="px-4 py-3">Last status</th>
                <th className="px-4 py-3">Enabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-base">
              {schedules.map((schedule) => {
                const cronValue = draftCron[schedule.id] ?? schedule.cron_expr
                const valid = isValidCron(cronValue)
                return (
                  <tr key={schedule.id}>
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-surface-text">
                      {schedule.workflow_title}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          value={cronValue}
                          onChange={(event) => setDraftCron((prev) => ({ ...prev, [schedule.id]: event.target.value }))}
                          className={`h-8 w-36 rounded border bg-surface-base px-2 font-mono text-xs outline-none ${valid ? 'border-surface-border' : 'border-red-400'}`}
                        />
                        <button
                          type="button"
                          disabled={!valid || cronValue === schedule.cron_expr || upsert.isPending}
                          onClick={() => updateSchedule(schedule, { cron_expr: cronValue })}
                          className="rounded p-1 text-greyscale-500 hover:bg-surface-raised disabled:opacity-40"
                          title="Save cron"
                        >
                          <Save size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-greyscale-500">{schedule.timezone}</td>
                    <td className="px-4 py-3 text-greyscale-500">{formatDate(schedule.next_run_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(schedule.last_dispatch_status)}`}>
                        {schedule.last_dispatch_status ?? 'none'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateSchedule(schedule, { is_active: !schedule.is_active })}
                      >
                        {schedule.is_active ? <Play size={14} /> : <Pause size={14} />}
                        {schedule.is_active ? 'Enabled' : 'Paused'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default WorkflowSchedulesPage
