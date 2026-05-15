import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentRunEventRecord, AgentRunStepRecord, AgentTeamRunRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { Drawer } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RotateCcw, X } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { formatDateTime } from '../sections/_shared'

interface Props {
  open: boolean
  onClose: () => void
  run: AgentTeamRunRecord | null
  aiLenserId: string
  handle: string
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400',
  running: 'border-primary-yellow-200 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300',
  blocked: 'border-orange-200 text-orange-700 dark:border-orange-500/30 dark:text-orange-300',
  completed: 'border-green-200 text-green-700 dark:border-green-500/30 dark:text-green-300',
  failed: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
  cancelled: 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500',
}

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.queued}`}
  >
    {status}
  </span>
)

const StepCard: React.FC<{ step: AgentRunStepRecord }> = ({ step }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</span>
      <StatusPill status={step.status} />
      <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
        lane {step.lane}
      </span>
    </div>
    {step.current_task && (
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{step.current_task}</p>
    )}
    {step.recent_output_summary && (
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{step.recent_output_summary}</p>
    )}
    {step.blocker_summary && (
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary-yellow-200 px-2.5 py-1 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
        <AlertTriangle size={11} />
        {step.blocker_summary}
      </p>
    )}
  </div>
)

export const RunDetailDrawer: React.FC<Props> = ({ open, onClose, run, aiLenserId, handle }) => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'steps' | 'events'>('steps')

  const steps = useQuery<AgentRunStepRecord[]>({
    queryKey: queryKeys.agents.runSteps(aiLenserId, run?.id ?? ''),
    queryFn: () => agentWorkspaceService.listAgentRunSteps(aiLenserId, run!.id),
    enabled: open && !!run,
    staleTime: 10_000,
  })

  const isRunning = run?.status === 'running'
  const events = useQuery<AgentRunEventRecord[]>({
    queryKey: [...queryKeys.agents.all, 'runEvents', aiLenserId, run?.id ?? ''],
    queryFn: () => agentWorkspaceService.listAgentRunEvents(aiLenserId, { runId: run!.id }),
    enabled: open && !!run && activeTab === 'events',
    staleTime: isRunning ? 0 : 30_000,
    refetchInterval: isRunning ? 3_000 : false,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(handle),
    })
  }

  const cancel = useMutation({
    mutationFn: () => agentWorkspaceService.cancelAgentRun(aiLenserId, run!.id),
    onSuccess: () => {
      toast.success('Run cancelled')
      invalidate()
      onClose()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const retry = useMutation({
    mutationFn: () => agentWorkspaceService.retryAgentRun(aiLenserId, run!.id),
    onSuccess: () => {
      toast.success('Run queued for retry')
      invalidate()
      onClose()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const isPending = cancel.isPending || retry.isPending
  const canCancel = run?.status === 'running' || run?.status === 'queued'
  const canRetry = run?.status === 'failed'

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[560px]" title="Run detail">
      {run && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-700">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Run ID
                </span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                  {run.id.slice(0, 8)}…{run.id.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Status
                </span>
                <StatusPill status={run.status} />
              </div>
              {run.approval_status && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Approval
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{run.approval_status}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Started
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {run.started_at ? formatDateTime(run.started_at) : '—'}
                </span>
              </div>
              {run.completed_at && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Completed
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDateTime(run.completed_at)}
                  </span>
                </div>
              )}
              {run.workflow_id && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Workflow
                  </span>
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {run.workflow_id.slice(0, 8)}…
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
              {(['steps', 'events'] as const).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${activeTab === tab
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                  {tab}
                  {tab === 'steps' && steps.data ? ` (${steps.data.length})` : ''}
                  {tab === 'events' && events.data ? ` (${events.data.length})` : ''}
                </Button>
              ))}
            </div>

            {activeTab === 'steps' && (
              steps.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                    />
                  ))}
                </div>
              ) : (steps.data ?? []).length === 0 ? (
                <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-700">
                  No steps recorded for this run.
                </p>
              ) : (
                <div className="space-y-2">
                  {(steps.data ?? []).map((step) => (
                    <StepCard key={step.id} step={step} />
                  ))}
                </div>
              )
            )}

            {activeTab === 'events' && (
              events.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                    />
                  ))}
                </div>
              ) : (events.data ?? []).length === 0 ? (
                <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-700">
                  No events recorded for this run.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(events.data ?? []).map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              )
            )}
          </div>

          {(canCancel || canRetry) && (
            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              {canCancel && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => cancel.mutate()}
                  disabled={isPending}
                  isLoading={cancel.isPending}
                >
                  <X size={14} className="mr-2 inline" />
                  {cancel.isPending ? 'Cancelling…' : 'Cancel run'}
                </Button>
              )}
              {canRetry && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => retry.mutate()}
                  disabled={isPending}
                  isLoading={retry.isPending}
                >
                  <RotateCcw size={14} className="mr-2 inline" />
                  {retry.isPending ? 'Retrying…' : 'Retry run'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  dispatch_queued: 'border-blue-200 text-blue-700 dark:border-blue-500/30 dark:text-blue-300',
  run_completed: 'border-green-200 text-green-700 dark:border-green-500/30 dark:text-green-300',
  run_failed: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
  approval_requested: 'border-primary-yellow-200 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300',
  node_completed: 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
  node_failed: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
}

const EventRow: React.FC<{ event: AgentRunEventRecord }> = ({ event }) => {
  const colorClass = EVENT_TYPE_COLORS[event.event_type] ?? 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-700">
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
      >
        {event.event_type}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
        {event.occurred_at ? formatDateTime(event.occurred_at) : '—'}
      </span>
    </div>
  )
}
