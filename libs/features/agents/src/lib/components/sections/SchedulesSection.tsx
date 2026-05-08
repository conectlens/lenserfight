import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { FEATURES } from '@lenserfight/utils/env'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, History, Pencil, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { ScheduleDrawer } from '../drawers/ScheduleDrawer'
import { ScheduleRunHistoryDrawer } from '../drawers/ScheduleRunHistoryDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type { WorkflowScheduleRecord } from '@lenserfight/types'

export const SchedulesSection: React.FC = () => {
  const { schedules, workflows, viewMode, bootstrap } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowScheduleRecord | null>(null)
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)
  const [historySchedule, setHistorySchedule] = useState<{
    id: string
    name: string
  } | null>(null)

  const isAgentOwner = viewMode === 'agent_owner'
  const canManage = isAgentOwner || viewMode === 'human_owner'

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.workflows.schedules(null),
    })
  }

  const remove = useMutation({
    mutationFn: (id: string) => workflowsService.deleteSchedule(id),
    onSuccess: () => { toast.success('Schedule deleted'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })

  const togglePause = useMutation({
    mutationFn: (s: WorkflowScheduleRecord) =>
      workflowsService.upsertSchedule({
        workflow_id: s.workflow_id,
        schedule_id: s.id,
        cron_expr: s.cron_expr,
        timezone: s.timezone ?? 'UTC',
        is_active: !s.is_active,
        assignee_type: (s.assignee_type as 'agent' | 'team') ?? 'agent',
        assignee_id: s.assignee_id ?? null,
        inputs_template: s.inputs_template ?? {},
      }),
    onSuccess: (_, s) => { toast.success(s.is_active ? 'Schedule paused' : 'Schedule resumed'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })

  if (!FEATURES.CRON_SCHEDULING) {
    return (
      <SectionPage
        eyebrow="Schedules"
        title="CRON-driven workflow dispatch"
        description="Workflow schedules dispatch manual, CRON-based, or team-assigned automation runs."
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <CalendarClock size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Scheduling is not enabled in this edition
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                CRON-driven workflow dispatch requires a full Supabase instance and the{' '}
                <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900">
                  VITE_FEATURE_CRON_SCHEDULING=true
                </code>{' '}
                environment variable. See the{' '}
                <a
                  href="/reference/known-preview-surfaces"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Known Preview Surfaces
                </a>{' '}
                guide for setup instructions and rollback steps.
              </p>
            </div>
          </div>
        </div>
      </SectionPage>
    )
  }

  return (
    <SectionPage
      eyebrow="Schedules"
      title="CRON-driven workflow dispatch"
      description="Workflow schedules dispatch manual, CRON-based, or team-assigned automation runs. Pause individual schedules to halt dispatch without deleting them."
      toolbar={
        canManage ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setDrawerOpen(true)
            }}
            disabled={workflows.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            <Plus size={16} />
            New schedule
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <EmptyPanel
            icon={<CalendarClock size={20} />}
            title="No schedules yet"
            description="Use workflow schedules to dispatch manual, CRON-based, or team-assigned automation runs."
          >
            {canManage ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setDrawerOpen(true)
                  }}
                  disabled={workflows.length === 0}
                  className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  {workflows.length === 0 ? 'Create a workflow first' : 'New schedule'}
                </button>
              </div>
            ) : undefined}
          </EmptyPanel>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {schedule.workflow_title}
                    </h3>
                    <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {schedule.assignee_type}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        schedule.is_active
                          ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                          : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-sm text-gray-700 dark:text-gray-200">
                    {schedule.cron_expr}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Next run: {formatDateTime(schedule.next_run_at)} · Timezone:{' '}
                    {schedule.timezone}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last status:{' '}
                    <span
                      className={`font-semibold ${
                        schedule.last_dispatch_status === 'dispatched'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : schedule.last_dispatch_status === 'dispatch_failed' ||
                            schedule.last_dispatch_status === 'validation_failed'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {schedule.last_dispatch_status ?? 'never dispatched'}
                    </span>
                  </span>
                  {schedule.last_error_at && (
                    <span
                      className="rounded-full border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:border-red-500/30 dark:text-red-400"
                      title={schedule.last_error_message ?? 'Last dispatch failed'}
                    >
                      ! error
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setHistorySchedule({ id: schedule.id, name: schedule.workflow_title })
                    }
                    className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
                    aria-label="View run history"
                  >
                    <History size={14} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => togglePause.mutate(schedule)}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        {schedule.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(schedule)
                          setDrawerOpen(true)
                        }}
                        className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Delete schedule?',
                            body: 'Delete this schedule? Dispatch will stop immediately.',
                            onConfirm: () => remove.mutate(schedule.id),
                          })
                        }
                        className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-red-600 dark:border-gray-700 dark:text-gray-400"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {canManage && (
        <ScheduleDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          workflows={workflows}
          initial={editing}
          defaultAssigneeId={bootstrap?.ai_lenser_id ?? null}
          onSaved={invalidate}
        />
      )}

      <AlertDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? ''}
        bodyText={confirmState?.body}
        variant="destructive"
        confirmAction={{
          label: 'Delete',
          onClick: () => { confirmState?.onConfirm(); setConfirmState(null) },
          loading: remove.isPending,
        }}
      />

      <ScheduleRunHistoryDrawer
        open={!!historySchedule}
        onClose={() => setHistorySchedule(null)}
        scheduleId={historySchedule?.id ?? null}
        scheduleName={historySchedule?.name ?? ''}
      />
    </SectionPage>
  )
}
