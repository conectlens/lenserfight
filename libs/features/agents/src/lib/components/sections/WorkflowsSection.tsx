import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { AgentTeamRecord, AgentWorkflowAssignmentRecord } from '@lenserfight/types'
import { Button, Card } from '@lenserfight/ui/components'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, Loader2, Play, Plus, Trash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { useTeamRunDispatch } from '../../hooks/useTeamRunDispatch'
import { WorkflowAssignmentDrawer } from '../drawers/WorkflowAssignmentDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard, formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

export const WorkflowsSection: React.FC = () => {
  const { workflows, schedules, profile, viewMode, bootstrap, activeTeamId } =
    useAgentWorkspace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isOwner = viewMode === 'agent_owner' || viewMode === 'human_owner'
  const isAgentOwner = viewMode === 'agent_owner'
  const aiLenserId = bootstrap?.ai_lenser_id ?? ''
  const returnTo = `/lenser/${profile.handle}/ag/workflows`
  const { dispatch, isPending: isDispatching } = useTeamRunDispatch()

  const [assignmentDrawer, setAssignmentDrawer] = useState<{
    open: boolean
    workflowId: string
    initial?: AgentWorkflowAssignmentRecord | null
  }>({ open: false, workflowId: '' })
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    label: string
  } | null>(null)

  const assignmentsQuery = useQuery<AgentWorkflowAssignmentRecord[]>({
    queryKey: queryKeys.agents.workflowAssignments(aiLenserId),
    queryFn: () => agentWorkspaceService.listWorkflowAssignments(aiLenserId),
    enabled: isAgentOwner && !!aiLenserId,
    staleTime: 30_000,
  })

  const invalidateAssignments = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workflowAssignments(aiLenserId),
    })

  const deleteAssignment = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteWorkflowAssignment(id),
    onSuccess: () => {
      toast.success('Workflow assignment removed')
      invalidateAssignments()
      setConfirmDelete(null)
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const allAssignments = assignmentsQuery.data ?? []
  const teams = ((bootstrap?.teams ?? []) as AgentTeamRecord[]).map((team) => ({
    id: team.id,
    name: team.name,
  }))

  const cards = useMemo(
    () =>
      workflows.map((workflow) => {
        const workflowAssignments = allAssignments.filter(
          (assignment) => assignment.workflow_id === workflow.id
        )
        const workflowSchedules = schedules.filter(
          (schedule) => schedule.workflow_id === workflow.id
        )
        const latestSchedule =
          [...workflowSchedules].sort((left, right) =>
            (right.last_run_at ?? '').localeCompare(left.last_run_at ?? '')
          )[0] ?? null

        return {
          workflow,
          assignments: workflowAssignments,
          schedules: workflowSchedules,
          latestSchedule,
        }
      }),
    [allAssignments, schedules, workflows]
  )

  const focusedTeamName =
    teams.find((team) => team.id === activeTeamId)?.name ?? 'the active builder team'

  return (
    <SectionPage
      eyebrow="Workflows"
      docsPath="/how-to/agents/workspace/workflows"
      docsTip="Saved automation library. Each workflow is a typed graph with a JSON I/O contract; bind it to schedules, webhooks, or teams via the assignment drawer."
      title="Workflow library"
      description={
        isAgentOwner
          ? 'This is the saved automation library for the selected AI lenser. Build reusable workflows here, assign them to the agent or a builder team, and open the dedicated workflow builder when you need to edit graph logic.'
          : 'Browse the saved workflow library for this lenser. Builder ownership and assignment controls stay private to the owner.'
      }
      toolbar={
        isOwner ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => navigate('/workflows/manage')}
            >
              <Plus size={14} />
              Create workflow
            </Button>
            <Link
              to="/workflows"
              className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
            >
              Browse templates
            </Link>
          </div>
        ) : undefined
      }
    >

      <div className="space-y-4">
        {cards.length === 0 ? (
          <EmptyPanel
            icon={<GitBranch size={20} />}
            title="No workflows in this library yet"
            description="Create a workflow or fork a template first. Builder defines the live team topology, while this page manages the saved automation graphs that the agent can run."
          >
            {isOwner && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/workflows/manage"
                  className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-yellow-600 dark:bg-white dark:text-gray-900"
                >
                  Create workflow
                </Link>
                <Link
                  to="/workflows"
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
                >
                  Browse templates
                </Link>
              </div>
            )}
          </EmptyPanel>
        ) : (
          cards.map(({ workflow, assignments, schedules: workflowSchedules, latestSchedule }) => (
            <WorkflowLibraryCard
              key={workflow.id}
              workflow={workflow}
              isOwner={isOwner}
              isAgentOwner={isAgentOwner}
              assignments={assignments}
              scheduleCount={workflowSchedules.length}
              latestSchedule={latestSchedule}
              isDispatching={isDispatching}
              onRunNow={(assignment) => {
                if (!bootstrap) return
                dispatch({ assignment, bootstrap }).then((result) => {
                  if (result.status === 'pending_approval') {
                    toast.info('Run queued — waiting for approval')
                  } else {
                    toast.success('Run started')
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
                    })
                  }
                }).catch((err: unknown) => {
                  toast.error(err instanceof Error ? err.message : 'Dispatch failed')
                })
              }}
              onNewAssignment={() =>
                setAssignmentDrawer({
                  open: true,
                  workflowId: workflow.id,
                  initial: null,
                })
              }
              onEditAssignment={(assignment) =>
                setAssignmentDrawer({
                  open: true,
                  workflowId: workflow.id,
                  initial: assignment,
                })
              }
              onDeleteAssignment={(assignment) =>
                setConfirmDelete({
                  id: assignment.id,
                  label: `${assignment.assignee_kind} assignment`,
                })
              }
              builderHref={`/workflows/${workflow.id}?returnTo=${encodeURIComponent(returnTo)}`}
            />
          ))
        )}
      </div>

      <WorkflowAssignmentDrawer
        open={assignmentDrawer.open}
        onClose={() => setAssignmentDrawer({ open: false, workflowId: '' })}
        aiLenserId={aiLenserId}
        workflows={
          assignmentDrawer.workflowId
            ? (workflows.filter((workflow) => workflow.id === assignmentDrawer.workflowId) as WorkflowRecord[])
            : (workflows as WorkflowRecord[])
        }
        teams={teams}
        initial={assignmentDrawer.initial}
        onSaved={invalidateAssignments}
      />

      <AlertDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove assignment?"
        bodyText={`Remove ${confirmDelete?.label ?? 'this assignment'}? This cannot be undone.`}
        variant="destructive"
        confirmAction={{
          label: 'Remove',
          onClick: () => confirmDelete && deleteAssignment.mutate(confirmDelete.id),
          loading: deleteAssignment.isPending,
        }}
      />
    </SectionPage>
  )
}

const LinkCard: React.FC<{
  to: string
  title: string
  description: string
}> = ({ to, title, description }) => (
  <Link
    to={to}
    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-primary-yellow-300 hover:bg-primary-yellow-50/60 dark:border-gray-800 dark:bg-gray-700 dark:hover:border-primary-yellow-500/40 dark:hover:bg-primary-yellow-500/10"
  >
    <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
      {description}
    </p>
  </Link>
)

const WorkflowLibraryCard: React.FC<{
  workflow: WorkflowRecord
  isOwner: boolean
  isAgentOwner: boolean
  assignments: AgentWorkflowAssignmentRecord[]
  scheduleCount: number
  isDispatching: boolean
  onRunNow: (assignment: AgentWorkflowAssignmentRecord) => void
  latestSchedule: {
    last_run_at: string | null
    last_dispatch_status: string | null
    next_run_at: string | null
  } | null
  onNewAssignment: () => void
  onEditAssignment: (assignment: AgentWorkflowAssignmentRecord) => void
  onDeleteAssignment: (assignment: AgentWorkflowAssignmentRecord) => void
  builderHref: string
}> = ({
  workflow,
  isOwner,
  isAgentOwner,
  assignments,
  scheduleCount,
  latestSchedule,
  isDispatching,
  onRunNow,
  onNewAssignment,
  onEditAssignment,
  onDeleteAssignment,
  builderHref,
}) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {workflow.title}
            </h3>
            <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
              {workflow.visibility}
            </span>
            {workflow.parent_workflow_id && (
              <span className="rounded-full border border-primary-yellow-200 px-2.5 py-0.5 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                Fork
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {workflow.description || 'No workflow description yet.'}
          </p>
        </div>

        <Link
          to={builderHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
        >
          Open builder
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <SummaryChip label="Nodes" value={String(workflow.node_count ?? 0)} />
        <SummaryChip label="Assignments" value={String(assignments.length)} />
        <SummaryChip label="Schedules" value={String(scheduleCount)} />
        <SummaryChip
          label="Latest dispatch"
          value={latestSchedule?.last_dispatch_status ?? 'Not scheduled'}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-700 dark:text-gray-300">
        <div className="grid gap-2 md:grid-cols-2">
          <span>
            Updated {formatDateTime(workflow.updated_at)}
          </span>
          <span>
            Next schedule {latestSchedule?.next_run_at ? formatDateTime(latestSchedule.next_run_at) : 'Not scheduled'}
          </span>
        </div>
        {latestSchedule?.last_run_at && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Last run {formatDateTime(latestSchedule.last_run_at)}
          </p>
        )}
      </div>

      {isAgentOwner && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={onNewAssignment}
            >
              <Plus size={12} />
              New assignment
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No assignments yet. Assign this workflow to the selected AI lenser or to a builder team before scheduling it.
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {assignment.assignee_kind}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${assignment.is_active
                        ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                        : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                        }`}
                    >
                      {assignment.is_active ? 'active' : 'paused'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {assignment.is_active && (
                      <Button
                        type="button"
                        disabled={isDispatching}
                        onClick={() => onRunNow(assignment)}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                      >
                        {isDispatching ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        Run
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => onEditAssignment(assignment)}
                      className="rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDeleteAssignment(assignment)}
                      className="rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isAgentOwner && isOwner && assignments.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-700 dark:text-gray-300">
          Assignment controls are only available inside the selected AI lenser control room.
        </div>
      )}
    </div>
  )

const SummaryChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-700">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
  </div>
)
