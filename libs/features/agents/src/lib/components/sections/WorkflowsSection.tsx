import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { AgentTeamRecord, AgentWorkflowAssignmentRecord } from '@lenserfight/types'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, GitBranch, Pencil, Plus, Trash2, Users } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { WorkflowAssignmentDrawer } from '../drawers/WorkflowAssignmentDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

export const WorkflowsSection: React.FC = () => {
  const { workflows, profile, viewMode, bootstrap } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isOwner = viewMode === 'agent_owner' || viewMode === 'human_owner'
  const aiLenserId = bootstrap?.ai_lenser_id ?? ''

  const [assignmentDrawer, setAssignmentDrawer] = useState<{
    open: boolean
    workflowId: string
    initial?: AgentWorkflowAssignmentRecord | null
  }>({ open: false, workflowId: '' })

  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    label: string
  } | null>(null)

  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null)

  const assignmentsQuery = useQuery<AgentWorkflowAssignmentRecord[]>({
    queryKey: queryKeys.agents.workflowAssignments(aiLenserId),
    queryFn: () => agentWorkspaceService.listWorkflowAssignments(aiLenserId),
    enabled: isOwner && !!aiLenserId,
    staleTime: 30_000,
  })

  const invalidateAssignments = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workflowAssignments(aiLenserId),
    })

  const deleteAssignment = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteWorkflowAssignment(id),
    onSuccess: () => {
      toast.success('Assignment removed')
      invalidateAssignments()
      setConfirmDelete(null)
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const allAssignments = assignmentsQuery.data ?? []
  const teams = ((bootstrap?.teams ?? []) as AgentTeamRecord[]).map((t) => ({
    id: t.id,
    name: t.name,
  }))

  return (
    <SectionPage
      eyebrow="Workflows"
      title="Connected lens workflows"
      description={
        isOwner
          ? 'Workflows are the operational units this workspace runs manually, on CRON schedules, or behind approval gates. Open the builder to wire lenses together.'
          : 'Public workflows owned by this Lenser.'
      }
      toolbar={
        isOwner ? (
          <Link
            to={`/lenser/${profile.handle}/workflows`}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
          >
            Open builder
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <EmptyPanel
            icon={<GitBranch size={20} />}
            title="No workflows yet"
            description="Workflows become the operational units that teams run manually, on CRON schedules, or behind approval gates."
          />
        ) : (
          workflows.map((workflow) => {
            const workflowAssignments = allAssignments.filter(
              (a) => a.workflow_id === workflow.id
            )
            const isExpanded = expandedWorkflowId === workflow.id

            return (
              <div
                key={workflow.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {workflow.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {workflow.description || 'No workflow description yet.'}
                    </p>
                  </div>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Open builder <ChevronRight size={16} />
                  </Link>
                </div>

                {isOwner && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWorkflowId(isExpanded ? null : workflow.id)
                      }
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                    >
                      <Users size={12} />
                      Assignments ({workflowAssignments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAssignmentDrawer({
                          open: true,
                          workflowId: workflow.id,
                          initial: null,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                    >
                      <Plus size={12} />
                      New assignment
                    </button>
                  </div>
                )}

                {isOwner && isExpanded && (
                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    {assignmentsQuery.isLoading ? (
                      <p className="text-xs text-gray-400">Loading assignments…</p>
                    ) : workflowAssignments.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        No assignments yet. Create one to route this workflow to an agent or team.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {workflowAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between rounded-[16px] border border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-950"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {a.assignee_kind}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 font-semibold ${
                                  a.is_active
                                    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                                    : 'border-gray-200 text-gray-400 dark:border-gray-700'
                                }`}
                              >
                                {a.is_active ? 'active' : 'paused'}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setAssignmentDrawer({
                                    open: true,
                                    workflowId: workflow.id,
                                    initial: a,
                                  })
                                }
                                aria-label="Edit assignment"
                                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    id: a.id,
                                    label: `${a.assignee_kind} assignment`,
                                  })
                                }
                                aria-label="Delete assignment"
                                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <WorkflowAssignmentDrawer
        open={assignmentDrawer.open}
        onClose={() => setAssignmentDrawer({ open: false, workflowId: '' })}
        aiLenserId={aiLenserId}
        workflows={
          assignmentDrawer.workflowId
            ? (workflows.filter((w) => w.id === assignmentDrawer.workflowId) as WorkflowRecord[])
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
