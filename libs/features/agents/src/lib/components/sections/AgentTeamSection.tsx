import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentProfileView } from '@lenserfight/data/repositories'
import type {
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
} from '@lenserfight/types'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Connection, Edge, Node } from '@xyflow/react'
import { Bot, GitMerge, Network, Plus, Trash2, UserPlus } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AgentGraphShell } from '../AgentGraphShell'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { AddTeamMemberDrawer } from '../drawers/AddTeamMemberDrawer'
import { CreateTeamDrawer } from '../drawers/CreateTeamDrawer'
import { TeamEdgesDrawer } from '../drawers/TeamEdgesDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard } from './_shared'
import { SectionPage } from './SectionPage'

export const AgentTeamSection: React.FC = () => {
  const {
    profile,
    bootstrap,
    bootstrapState,
    viewMode,
    activeTeamId,
    ownerFleetAgents,
    ownerFleetAgentsLoading,
  } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isAgentOwner = viewMode === 'agent_owner'

  const [selectedTeamId, setSelectedTeamId] = useState(activeTeamId ?? '')
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [addMemberState, setAddMemberState] = useState<{
    open: boolean
    teamId: string
    defaultAgentId?: string
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

  useEffect(() => {
    if (selectedTeamId) return
    setSelectedTeamId(activeTeamId ?? '')
  }, [activeTeamId, selectedTeamId])

  const teams = (bootstrap?.teams ?? []) as Array<
    AgentTeamRecord & {
      member_count: number
      members?: AgentTeamMemberRecord[]
      edges?: AgentTeamEdgeRecord[]
    }
  >

  const selectedTeam =
    teams.find((team) => team.id === selectedTeamId) ??
    teams.find((team) => team.is_active) ??
    teams[0] ??
    null

  const members = (selectedTeam?.members ?? []) as AgentTeamMemberRecord[]
  const teamEdges = (selectedTeam?.edges ?? []) as AgentTeamEdgeRecord[]

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const deleteMember = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteTeamMember(id),
    onSuccess: () => {
      toast.success('Builder member removed')
      invalidate()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const deleteTeam = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteTeam(id),
    onSuccess: () => {
      toast.success('Builder team deleted')
      setSelectedTeamId('')
      invalidate()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const createEdge = useMutation({
    mutationFn: ({
      sourceMemberId,
      targetMemberId,
    }: {
      sourceMemberId: string
      targetMemberId: string
    }) =>
      agentWorkspaceService.upsertTeamEdge({
        team_id: selectedTeam!.id,
        source_member_id: sourceMemberId,
        target_member_id: targetMemberId,
        edge_type: 'handoff',
        is_blocking: false,
      }),
    onSuccess: () => {
      toast.success('Builder edge created')
      invalidate()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const handleConnect = (connection: Connection) => {
    if (!selectedTeam || !connection.source || !connection.target) return
    if (connection.source === connection.target) {
      toast.error('Connect two different agents.')
      return
    }
    createEdge.mutate({
      sourceMemberId: connection.source,
      targetMemberId: connection.target,
    })
  }

  const layoutPositions = (team: typeof selectedTeam, teamMembers: AgentTeamMemberRecord[]) => {
    const storedPositions =
      (team?.scratchpad as { positions?: Record<string, { x: number; y: number }> } | null)
        ?.positions ?? {}
    const laneOffsets = new Map<number, number>()

    return teamMembers.map((member) => {
      const stored = storedPositions[member.id]
      if (stored) return stored

      const offset = laneOffsets.get(member.lane) ?? 0
      laneOffsets.set(member.lane, offset + 1)
      return {
        x: member.lane * 280,
        y: offset * 160,
      }
    })
  }

  const nodes = useMemo<Node[]>(() => {
    if (!selectedTeam) return []

    const positions = layoutPositions(selectedTeam, members)

    return members.map((member, index) => {
      const agent = ownerFleetAgents.find((candidate) => candidate.ai_lenser_id === member.agent_id)
      return {
        id: member.id,
        position: positions[index] ?? { x: member.lane * 280, y: index * 150 },
        data: {
          label: [
            member.role.replaceAll('_', ' '),
            agent?.display_name || agent?.handle || member.agent_id.slice(0, 8),
          ].join(' · '),
        },
      }
    })
  }, [members, ownerFleetAgents, selectedTeam])

  const edges = useMemo<Edge[]>(
    () =>
      teamEdges.map((edge) => ({
        id: edge.id,
        source: edge.source_member_id,
        target: edge.target_member_id,
        label: edge.edge_type,
        animated: edge.is_blocking,
      })),
    [teamEdges]
  )

  const edgesTeamMembers =
    (edgesState.team ? teams.find((team) => team.id === edgesState.team?.id)?.members ?? [] : []) as AgentTeamMemberRecord[]
  const edgesTeamEdges =
    (edgesState.team ? teams.find((team) => team.id === edgesState.team?.id)?.edges ?? [] : []) as AgentTeamEdgeRecord[]

  if (!isAgentOwner) {
    return (
      <SectionPage
        eyebrow="Builder"
        title="Multi-agent graph"
        description="Builder is where the owner connects agents into a live team topology. Workflow automation stays in the separate library surface."
      >
        <EmptyPanel
          icon={<Network size={20} />}
          title="Builder is owner-only"
          description="Public viewers can inspect the overview and workflow library, but only the owner can edit the team graph."
        />
      </SectionPage>
    )
  }

  return (
    <SectionPage
      eyebrow="Builder"
      title="Multi-agent graph"
      description="Builder owns the live team topology: which agents participate, how they hand work off, and which active team is currently in focus. Workflows remain the reusable automation library and run definition layer."
      toolbar={
        <button
          type="button"
          onClick={() => setCreateTeamOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
        >
          <Plus size={14} />
          New team
        </button>
      }
    >
      <BootstrapStatusPanel state={bootstrapState} />

      {bootstrap && (
        <AgentGraphShell
          nodes={nodes}
          edges={edges}
          onConnect={handleConnect}
          emptyState={{
            title: selectedTeam ? 'No members on this builder yet' : 'No active team exists',
            description: selectedTeam
              ? 'Add agents from the owner palette to start composing a live team graph.'
              : 'Create a builder team first, then connect agents on the canvas to shape professional handoffs and review lanes.',
            action: (
              <button
                type="button"
                onClick={() => setCreateTeamOpen(true)}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
              >
                Create team
              </button>
            ),
          }}
          sidePanel={
            <>
              <ProfileCard
                title="Team in focus"
                subtitle="One active team graph stays in view here. Saved workflow logic belongs on the Workflows page."
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Active team
                    </span>
                    <select
                      value={selectedTeam?.id ?? ''}
                      onChange={(event) => setSelectedTeamId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedTeam ? (
                    <>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <BuilderRow label="Members" value={String(members.length)} />
                        <BuilderRow label="Edges" value={String(teamEdges.length)} />
                        <BuilderRow
                          label="Mode"
                          value={selectedTeam.is_active ? 'Active team' : 'Draft team'}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAddMemberState({
                              open: true,
                              teamId: selectedTeam.id,
                              defaultAgentId: bootstrap.ai_lenser_id,
                              initial: null,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                        >
                          <UserPlus size={13} />
                          Add member
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEdgesState({
                              open: true,
                              team: selectedTeam,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                        >
                          <GitMerge size={13} />
                          Manage edges
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmState({
                              title: 'Delete team?',
                              body: `Delete "${selectedTeam.name}"? This cannot be undone.`,
                              onConfirm: () => deleteTeam.mutate(selectedTeam.id),
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          <Trash2 size={13} />
                          Delete team
                        </button>
                      </div>
                    </>
                  ) : (
                    <EmptyPanel
                      icon={<Bot size={18} />}
                      title="No team selected"
                      description="Create a team or switch focus to an existing one before editing the builder canvas."
                    />
                  )}
                </div>
              </ProfileCard>

              <ProfileCard
                title="Agent palette"
                subtitle="These are the authenticated owner’s agents. Add them to the active builder graph, then connect them on the canvas."
              >
                {ownerFleetAgentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-950"
                      />
                    ))}
                  </div>
                ) : ownerFleetAgents.length === 0 ? (
                  <EmptyPanel
                    icon={<Bot size={18} />}
                    title="No agents in this fleet"
                    description="Create AI lensers from the human overview first, then return here to compose a builder graph."
                  />
                ) : (
                  <div className="space-y-3">
                    {ownerFleetAgents.map((agent) => {
                      const onCanvas = members.some((member) => member.agent_id === agent.ai_lenser_id)
                      return (
                        <PaletteAgentCard
                          key={agent.ai_lenser_id}
                          agent={agent}
                          onCanvas={onCanvas}
                          disabled={!selectedTeam}
                          onAdd={() =>
                            setAddMemberState({
                              open: true,
                              teamId: selectedTeam?.id ?? '',
                              defaultAgentId: agent.ai_lenser_id,
                              initial: null,
                            })
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </ProfileCard>

              <ProfileCard
                title="Builder vs workflows"
                subtitle="A professional split removes duplication instead of forcing the same concept into two pages."
              >
                <div className="space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  <p>
                    Builder is the live team canvas: who participates, who reviews,
                    and how work is handed off.
                  </p>
                  <p>
                    Workflows are the saved automation library: reusable logic,
                    schedules, templates, and run entry points that can be
                    assigned to an agent or team.
                  </p>
                </div>
              </ProfileCard>
            </>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((member) => (
          <BuilderMemberCard
            key={member.id}
            member={member}
            agent={ownerFleetAgents.find((candidate) => candidate.ai_lenser_id === member.agent_id) ?? null}
            onEdit={() =>
              setAddMemberState({
                open: true,
                teamId: selectedTeam?.id ?? '',
                initial: member,
              })
            }
            onDelete={() =>
              setConfirmState({
                title: 'Remove member?',
                body: 'Remove this agent from the active builder team? This cannot be undone.',
                onConfirm: () => deleteMember.mutate(member.id),
              })
            }
          />
        ))}
      </div>

      {bootstrap && (
        <CreateTeamDrawer
          open={createTeamOpen}
          onClose={() => setCreateTeamOpen(false)}
          aiLenserId={bootstrap.ai_lenser_id}
          onCreated={() => {
            invalidate()
            setCreateTeamOpen(false)
          }}
        />
      )}

      <AddTeamMemberDrawer
        open={addMemberState.open}
        onClose={() => setAddMemberState((state) => ({ ...state, open: false }))}
        teamId={addMemberState.teamId}
        defaultAgentId={addMemberState.defaultAgentId}
        initial={addMemberState.initial}
        onSaved={invalidate}
      />

      {edgesState.team && (
        <TeamEdgesDrawer
          open={edgesState.open}
          onClose={() => setEdgesState((state) => ({ ...state, open: false }))}
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
          onClick: () => {
            confirmState?.onConfirm()
            setConfirmState(null)
          },
          loading: deleteTeam.isPending || deleteMember.isPending,
        }}
      />
    </SectionPage>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const BuilderRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)

const PaletteAgentCard: React.FC<{
  agent: AgentProfileView
  onCanvas: boolean
  disabled: boolean
  onAdd: () => void
}> = ({ agent, onCanvas, disabled, onAdd }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {agent.display_name || `@${agent.handle}`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          @{agent.handle} · {agent.runtime_pref}
        </p>
      </div>
      {onCanvas ? (
        <span className="rounded-full border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300">
          On canvas
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
        >
          <Plus size={12} />
          Add
        </button>
      )}
    </div>
  </div>
)

const BuilderMemberCard: React.FC<{
  member: AgentTeamMemberRecord
  agent: AgentProfileView | null
  onEdit: () => void
  onDelete: () => void
}> = ({ member, agent, onEdit, onDelete }) => (
  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {member.role.replaceAll('_', ' ')}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {agent?.display_name || agent?.handle || member.agent_id.slice(0, 8)}
        </p>
        {member.responsibility && (
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {member.responsibility}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          Remove
        </button>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span className="rounded-full border border-gray-200 px-2 py-1 dark:border-gray-700">
        Lane {member.lane}
      </span>
      <span className="rounded-full border border-gray-200 px-2 py-1 dark:border-gray-700">
        Sort {member.sort_order}
      </span>
    </div>
  </div>
)
