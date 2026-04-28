import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentTeamEdgeRecord, AgentTeamMemberRecord, AgentTeamRecord } from '@lenserfight/types'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, GitMerge, Plus, Trash2, UserPlus } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AddTeamMemberDrawer } from '../drawers/AddTeamMemberDrawer'
import { CreateTeamDrawer } from '../drawers/CreateTeamDrawer'
import { TeamEdgesDrawer } from '../drawers/TeamEdgesDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

export const AgentTeamSection: React.FC = () => {
  const { profile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isAgentOwner = viewMode === 'agent_owner'

  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [addMemberState, setAddMemberState] = useState<{
    open: boolean
    teamId: string
    initial?: AgentTeamMemberRecord | null
  }>({ open: false, teamId: '' })
  const [edgesState, setEdgesState] = useState<{
    open: boolean
    team: AgentTeamRecord | null
  }>({ open: false, team: null })
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)

  const teams = bootstrap?.teams ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const deleteMember = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteTeamMember(id),
    onSuccess: () => { toast.success('Member removed'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })

  const deleteTeam = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteTeam(id),
    onSuccess: () => { toast.success('Team deleted'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })

  const edgesTeam = edgesState.team
  const edgesTeamMembers =
    (edgesTeam
      ? teams.find((t) => t.id === edgesTeam.id)?.members ?? []
      : []) as AgentTeamMemberRecord[]
  const edgesTeamEdges =
    (edgesTeam
      ? teams.find((t) => t.id === edgesTeam.id)?.edges ?? []
      : []) as AgentTeamEdgeRecord[]

  return (
    <SectionPage
      eyebrow="Agent team"
      title="Team and lane composition"
      description={
        isAgentOwner
          ? 'Teams group operators into lanes with delegation edges. Add lead operators, specialists, and reviewers to unlock parallel runs.'
          : 'Teams owned by this Lenser. Switch into the agent workspace to manage team membership.'
      }
      toolbar={
        isAgentOwner ? (
          <button
            type="button"
            onClick={() => setCreateTeamOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={14} />
            New team
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {teams.length === 0 ? (
          <EmptyPanel
            icon={<Bot size={22} />}
            title="No active team exists"
            description="Create a named team to unlock the board-style graph, delegation lanes, and team-targeted schedules."
          />
        ) : (
          teams.map((team) => {
            const members = (team.members as AgentTeamMemberRecord[] | undefined) ?? []
            const edges = (team.edges as AgentTeamEdgeRecord[] | undefined) ?? []
            return (
              <div
                key={team.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {team.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {members.length} member{members.length !== 1 ? 's' : ''} · {edges.length} edge{edges.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {isAgentOwner && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEdgesState({ open: true, team: team as AgentTeamRecord })
                        }
                        aria-label="Manage edges"
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        <GitMerge size={13} />
                        Edges
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAddMemberState({ open: true, teamId: team.id, initial: null })
                        }
                        aria-label="Add member"
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        <UserPlus size={13} />
                        Add member
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Delete team?',
                            body: `Delete "${team.name}"? This cannot be undone.`,
                            onConfirm: () => deleteTeam.mutate(team.id),
                          })
                        }
                        aria-label="Delete team"
                        className="rounded-2xl border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {members.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        showActions={isAgentOwner}
                        onEdit={() =>
                          setAddMemberState({
                            open: true,
                            teamId: team.id,
                            initial: member,
                          })
                        }
                        onDelete={() =>
                          setConfirmState({
                            title: 'Remove member?',
                            body: 'Remove this member from the team? This cannot be undone.',
                            onConfirm: () => deleteMember.mutate(member.id),
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {bootstrap && (
        <CreateTeamDrawer
          open={createTeamOpen}
          onClose={() => setCreateTeamOpen(false)}
          aiLenserId={bootstrap.ai_lenser_id}
          onCreated={invalidate}
        />
      )}

      <AddTeamMemberDrawer
        open={addMemberState.open}
        onClose={() => setAddMemberState((s) => ({ ...s, open: false }))}
        teamId={addMemberState.teamId}
        defaultAgentId={bootstrap?.ai_lenser_id ?? ''}
        initial={addMemberState.initial}
        onSaved={invalidate}
      />

      {edgesState.team && (
        <TeamEdgesDrawer
          open={edgesState.open}
          onClose={() => setEdgesState((s) => ({ ...s, open: false }))}
          teamId={edgesState.team.id}
          members={edgesTeamMembers}
          edges={edgesTeamEdges}
          onChanged={invalidate}
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
          loading: deleteTeam.isPending || deleteMember.isPending,
        }}
      />
    </SectionPage>
  )
}

const MemberCard: React.FC<{
  member: AgentTeamMemberRecord
  showActions: boolean
  onEdit: () => void
  onDelete: () => void
}> = ({ member, showActions, onEdit, onDelete }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{member.role}</p>
        <p className="mt-0.5 text-xs text-gray-400">Lane {member.lane} · order {member.sort_order}</p>
        {member.responsibility && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{member.responsibility}</p>
        )}
      </div>
      {showActions && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-amber-300 hover:text-amber-700 dark:border-gray-600 dark:text-gray-300"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remove member"
            className="rounded-xl p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  </div>
)
