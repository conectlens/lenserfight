import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { Button, Card } from '@lenserfight/ui/components'
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
  const { schedules, workflows, viewMode, bootstrap, agentProfile, profile } =
    useAgentWorkspace()
  // For agent_owner mode the active workspace is the human owner of the AI;
  // for human_owner mode the visited profile IS the owner. Either way, the
  // schedule RPC needs workflows owned by this lenser.
  const ownerLenserId =
    viewMode === 'agent_owner'
      ? (agentProfile?.owner_lenser_id ?? null)
      : viewMode === 'human_owner'
        ? profile.id
        : null
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
        docsPath="/how-to/agents/workspace/schedules"
        docsTip="Cron-driven workflow triggers. Each schedule pins a workflow, cron expression, timezone, assignee, and JSON inputs template."
        title="CRON-driven workflow dispatch"
        description="Workflow schedules dispatch manual, CRON-based, or team-assigned automation runs."
      >
        <div className="rounded-2xl border border-primary-yellow-200 bg-primary-yellow-50 p-6 dark:border-primary-yellow-800 dark:bg-primary-yellow-950/30">
          <div className="flex items-start gap-3">
            <CalendarClock size={20} className="mt-0.5 shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
            <div>
              <p className="font-semibold text-primary-yellow-900 dark:text-primary-yellow-200">
                Scheduling is not enabled in this edition
              </p>
              <p className="mt-1 text-sm text-primary-yellow-800 dark:text-primary-yellow-300">
                CRON-driven workflow dispatch requires a full Supabase instance and the{' '}
                <code className="rounded bg-primary-yellow-100 px-1 text-xs dark:bg-primary-yellow-900">
                  FEATURE_CRON_SCHEDULING=true
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
      docsPath="/how-to/agents/workspace/schedules"
      docsTip="Cron-driven workflow triggers. Pause an entry to halt dispatch without deleting it; open Run History to inspect past dispatches."
      title="CRON-driven workflow dispatch"
      description="Workflow schedules dispatch manual, CRON-based, or team-assigned automation runs. Pause individual schedules to halt dispatch without deleting them."
      toolbar={
        canManage ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setDrawerOpen(true)
            }}
            disabled={workflows.length === 0}
          >
            <Plus size={16} />
            New schedule
          </Button>
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
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setDrawerOpen(true)
                  }}
                  disabled={workflows.length === 0}
                >
                  {workflows.length === 0 ? 'Create a workflow first' : 'New schedule'}
                </Button>
              </div>
            ) : undefined}
          </EmptyPanel>
        ) : (
          schedules.map((schedule) => (
            <Card
              key={schedule.id}
              className="!p-5"
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
                  <Button
                    type="button"
                    onClick={() =>
                      setHistorySchedule({ id: schedule.id, name: schedule.workflow_title })
                    }
                    className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-primary-yellow-600 dark:border-gray-700 dark:text-gray-400"
                    aria-label="View run history"
                  >
                    <History size={14} />
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => togglePause.mutate(schedule)}
                      >
                        {schedule.is_active ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setEditing(schedule)
                          setDrawerOpen(true)
                        }}
                        className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-primary-yellow-600 dark:border-gray-700 dark:text-gray-400"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
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
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {canManage && (
        <ScheduleDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          workflows={workflows}
          initial={editing}
          ownerLenserId={ownerLenserId}
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
