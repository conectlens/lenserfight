import type { WorkflowScheduleRecord } from '@lenserfight/types'
import { ExperimentalBadge } from '@lenserfight/ui/components'
import { CalendarClock, Clock, Pause, Play, Plus, Trash2 } from 'lucide-react'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { useDeleteWorkflowSchedule, useUpsertWorkflowSchedule, useWorkflowSchedules } from '../hooks/useWorkflowSchedules'

const CRON_PRESETS = [
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Every 6h', expr: '0 */6 * * *' },
  { label: 'Daily at midnight', expr: '0 0 * * *' },
  { label: 'Mondays at 9am', expr: '0 9 * * 1' },
  { label: 'Weekly Sunday', expr: '0 0 * * 0' },
]

export interface WorkflowCronPanelRef {
  /** Saves the pending cron expression if the form is open. No-op if empty. */
  save: () => Promise<void>
}

interface WorkflowCronPanelProps {
  workflowId: string
  isOwner: boolean
  /** Hide the Save button inside the form — caller drives save via ref.save(). */
  hideSaveButton?: boolean
}

export const WorkflowCronPanel = forwardRef<WorkflowCronPanelRef, WorkflowCronPanelProps>(
  function WorkflowCronPanel({ workflowId, isOwner, hideSaveButton = false }, ref) {
    const { data: schedules = [], isLoading } = useWorkflowSchedules(workflowId)
    const { mutateAsync: upsertSchedule, isPending: upserting } = useUpsertWorkflowSchedule(workflowId)
    const { mutate: deleteSchedule } = useDeleteWorkflowSchedule(workflowId)

    const [showForm, setShowForm] = useState(false)
    const [cronExpr, setCronExpr] = useState('')
    const [active, setActive] = useState(true)

    const doSave = async () => {
      if (!cronExpr.trim()) return
      await upsertSchedule(
        { workflow_id: workflowId, cron_expr: cronExpr.trim(), is_active: active },
      )
      setShowForm(false)
      setCronExpr('')
    }

    useImperativeHandle(ref, () => ({ save: doSave }))

    const toggleActive = (schedule: WorkflowScheduleRecord) => {
      upsertSchedule({
        workflow_id: workflowId,
        schedule_id: schedule.id,
        cron_expr: schedule.cron_expr,
        is_active: !schedule.is_active,
      })
    }

    if (isLoading) {
      return (
        <div className="px-4 py-6 text-sm text-greyscale-400 text-center">Loading schedules…</div>
      )
    }

    return (
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-greyscale-700 dark:text-greyscale-200 uppercase tracking-wide">
            <CalendarClock size={13} />
            CRON Schedules
            <ExperimentalBadge mode="inline" title="Experimental" />
          </div>
          {isOwner && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-xs font-medium text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        <ExperimentalBadge
          title="CRON scheduling"
          description="Cron-driven workflow runs are wired up but I haven't fully tested edge cases (skipped windows, overlapping runs, timezone drift). Start with a low-frequency schedule and watch the first few fires."
        />

        {/* Add form */}
        {isOwner && showForm && (
          <div className="space-y-2">
            <label className="block text-[10px] font-medium text-greyscale-400 uppercase tracking-wide">
              CRON Expression
            </label>
            <input
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="0 * * * *"
              className="w-full rounded-lg border border-surface-border bg-surface-base px-2.5 py-1.5 text-sm font-mono text-greyscale-800 dark:text-greyscale-100 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder-greyscale-400"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.expr}
                  type="button"
                  onClick={() => setCronExpr(p.expr)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    cronExpr === p.expr
                      ? 'border-primary-yellow-500/50 bg-primary-yellow-500/10 text-primary-yellow-700 dark:text-primary-yellow-400'
                      : 'border-surface-border text-greyscale-500 hover:border-greyscale-400 hover:text-greyscale-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className={`w-8 h-4 rounded-full transition-colors ${active ? 'bg-status-green' : 'bg-greyscale-300 dark:bg-greyscale-600'}`}
                onClick={() => setActive((v) => !v)}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 mx-0.5 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-greyscale-600 dark:text-greyscale-300">Active</span>
            </label>

            {!hideSaveButton && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doSave}
                  disabled={!cronExpr.trim() || upserting}
                  className="flex-1 py-1.5 rounded-lg bg-primary-yellow-500 text-gray-900 text-xs font-semibold hover:bg-primary-yellow-400 disabled:opacity-40 transition-colors"
                >
                  {upserting ? 'Saving…' : 'Save Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setCronExpr('') }}
                  className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-greyscale-500 hover:text-greyscale-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedule list */}
        {schedules.length === 0 && !showForm ? (
          <div className="rounded-lg border border-dashed border-surface-border py-6 text-center text-xs text-greyscale-400">
            <Clock size={20} className="mx-auto mb-2 opacity-40" />
            No schedules yet.
            {isOwner && ' Add one to automate this workflow.'}
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-start gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2"
              >
                {/* Active toggle */}
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => toggleActive(schedule)}
                    title={schedule.is_active ? 'Pause schedule' : 'Resume schedule'}
                    className={`mt-0.5 flex-shrink-0 transition-colors ${schedule.is_active ? 'text-status-green' : 'text-greyscale-400'}`}
                  >
                    {schedule.is_active ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                ) : (
                  <span className={`mt-0.5 flex-shrink-0 ${schedule.is_active ? 'text-status-green' : 'text-greyscale-400'}`}>
                    {schedule.is_active ? <Play size={13} /> : <Pause size={13} />}
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-medium text-greyscale-800 dark:text-greyscale-100">
                    {schedule.cron_expr}
                  </p>
                  {schedule.last_run_at && (
                    <p className="text-[10px] text-greyscale-400 mt-0.5">
                      Last run: {new Date(schedule.last_run_at).toLocaleString()}
                      {schedule.last_dispatch_status && (
                        <span
                          className={`ml-1.5 px-1 py-0.5 rounded text-[9px] font-medium ${
                            schedule.last_dispatch_status === 'dispatched'
                              ? 'bg-status-green/15 text-status-green'
                              : 'bg-status-red/15 text-status-red'
                          }`}
                        >
                          {schedule.last_dispatch_status}
                        </span>
                      )}
                    </p>
                  )}
                  {schedule.last_error_message && (
                    <p className="text-[10px] text-status-red mt-0.5 truncate" title={schedule.last_error_message}>
                      {schedule.last_error_message}
                    </p>
                  )}
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => deleteSchedule(schedule.id)}
                    className="flex-shrink-0 p-1 rounded text-greyscale-300 hover:text-status-red transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
