import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type {
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
} from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useModalRouter } from '@lenserfight/ui/routing'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Connection, Edge, Node } from '@xyflow/react'
import { Network } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AgentGraphShell } from '../AgentGraphShell'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { AgentPalettePanel } from '../canvas/AgentPalettePanel'
import { CreateTeamDialog } from '../dialogs/CreateTeamDialog'
import { AddTeamMemberDrawer } from '../drawers/AddTeamMemberDrawer'
import { ScheduleDrawer } from '../drawers/ScheduleDrawer'
import { TeamEdgesDrawer } from '../drawers/TeamEdgesDrawer'
import { WorkflowAssignmentDrawer } from '../drawers/WorkflowAssignmentDrawer'
import { EmptyPanel } from '../EmptyPanel'
import { TeamContextualPanel } from '../panels/TeamContextualPanel'

import { SectionPage } from './SectionPage'

export const AgentTeamSection: React.FC = () => {
  const {
    profile,
    bootstrap,
    bootstrapState,
    isOwner,
    agentProfile,
    activeTeamId,
    ownerFleetAgents,
    ownerFleetAgentsLoading,
    workflows,
  } = useAgentWorkspace()
  const { open } = useModalRouter()
  const queryClient = useQueryClient()

  const [selectedTeamId, setSelectedTeamId] = useState(activeTeamId ?? '')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)
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
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false)
  const [workflowAssignmentOpen, setWorkflowAssignmentOpen] = useState(false)

  const activeAiLenserId = bootstrap?.ai_lenser_id ?? agentProfile?.ai_lenser_id ?? ''

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
  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name }))

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const deleteMember = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteTeamMember(id),
    onSuccess: () => {
      toast.success('Member removed')
      setSelectedNodeId(null)
      invalidate()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const deleteTeam = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteTeam(id),
    onSuccess: () => {
      toast.success('Team deleted')
      setSelectedTeamId('')
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
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
    onSuccess: (edge) => {
      invalidate()
      // Select the new edge so the inspector opens immediately
      if (edge) setSelectedEdgeId(edge.id)
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const addMemberDirect = useMutation({
    mutationFn: (agentId: string) =>
      agentWorkspaceService.addTeamMember({
        team_id: selectedTeam!.id,
        agent_id: agentId,
        role: 'executor',
        lane: 1,
        sort_order: members.length + 1,
      }),
    onSuccess: (member) => {
      invalidate()
      // Select the new member node so the inspector opens for inline editing
      if (member) setSelectedNodeId(member.id)
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

  const layoutPositions = (
    team: typeof selectedTeam,
    teamMembers: AgentTeamMemberRecord[],
  ) => {
    const storedPositions =
      (team?.scratchpad as { positions?: Record<string, { x: number; y: number }> } | null)
        ?.positions ?? {}
    const laneOffsets = new Map<number, number>()

    return teamMembers.map((member) => {
      const stored = storedPositions[member.id]
      if (stored) return stored
      const offset = laneOffsets.get(member.lane) ?? 0
      laneOffsets.set(member.lane, offset + 1)
      return { x: member.lane * 280, y: offset * 160 }
    })
  }

  // Stable refs so node callbacks don't embed stale closures and don't invalidate
  // all node data objects on every members/selectedTeam change.
  const membersRef = useRef(members)
  const selectedTeamRef = useRef(selectedTeam)
  useEffect(() => { membersRef.current = members }, [members])
  useEffect(() => { selectedTeamRef.current = selectedTeam }, [selectedTeam])

  const handleNodeEdit = useCallback((id: string) => {
    const m = membersRef.current.find((x) => x.id === id)
    const team = selectedTeamRef.current
    if (!m || !team) return
    setAddMemberState({ open: true, teamId: team.id, initial: m })
  }, [])

  const handleNodeRemove = useCallback((id: string) => {
    setConfirmState({
      title: 'Remove member?',
      body: 'Remove this agent from the active builder team? This cannot be undone.',
      onConfirm: () => deleteMember.mutate(id),
    })
  }, [deleteMember])

  const nodes = useMemo<Node[]>(() => {
    if (!selectedTeam) return []
    const positions = layoutPositions(selectedTeam, members)
    return members.map((member, index) => {
      const agent = ownerFleetAgents.find((a) => a.ai_lenser_id === member.agent_id)
      return {
        id: member.id,
        type: 'agentNode',
        position: positions[index] ?? { x: member.lane * 280, y: index * 150 },
        data: {
          label: member.role.replaceAll('_', ' '),
          sublabel: agent?.display_name || member.agent_id.slice(0, 8),
          agentHandle: agent?.handle,
          isLead: member.role === 'leader',
          role: member.role,
          status: 'idle' as const,
          onEdit: handleNodeEdit,
          onRemove: handleNodeRemove,
        },
      }
    })
  }, [members, ownerFleetAgents, selectedTeam, handleNodeEdit, handleNodeRemove])

  const edges = useMemo<Edge[]>(
    () =>
      teamEdges.map((edge) => ({
        id: edge.id,
        type: 'agentEdge',
        source: edge.source_member_id,
        target: edge.target_member_id,
        data: {
          edge_type: edge.edge_type,
          is_blocking: edge.is_blocking,
          onConfigure: (id: string) => {
            setSelectedEdgeId(id)
            setSelectedNodeId(null)
          },
        },
      })),
    [teamEdges]
  )

  const edgesTeamMembers = (
    edgesState.team
      ? teams.find((t) => t.id === edgesState.team?.id)?.members ?? []
      : []
  ) as AgentTeamMemberRecord[]

  const edgesTeamEdges = (
    edgesState.team
      ? teams.find((t) => t.id === edgesState.team?.id)?.edges ?? []
      : []
  ) as AgentTeamEdgeRecord[]

  if (!isOwner) {
    return (
      <SectionPage
        eyebrow="Builder"
        docsPath="/how-to/agents/workspace/team-builder"
        docsTip="Builder is the live multi-agent graph. Each node is an agent or tool role; each edge is a handoff. Owners only."
        title="Multi-agent graph"
        description="Builder is where the owner connects agents into a live team topology."
      >
        <EmptyPanel
          icon={<Network size={20} />}
          title="Owner access required"
          description="Only the owner of this AI lenser can view and edit the builder graph."
        />
      </SectionPage>
    )
  }

  return (
    <SectionPage
      eyebrow="Builder"
      docsPath="/how-to/agents/workspace/team-builder"
      docsTip="Builder owns the live team topology: who participates, how they hand work off, and which active team is currently in focus."
      title="Multi-agent graph"
      description="Builder owns the live team topology: who participates, how they hand work off, and which active team is currently in focus."
    >
      <BootstrapStatusPanel state={bootstrapState} />

      <AgentGraphShell
        nodes={nodes}
        edges={edges}
        onConnect={bootstrap ? handleConnect : undefined}
        selectedNodeId={selectedNodeId}
        selectedEdgeId={selectedEdgeId}
        onNodeSelect={(id) => {
          setSelectedNodeId(id)
          if (id) setSelectedEdgeId(null)
        }}
        onEdgeSelect={(id) => {
          setSelectedEdgeId(id)
          if (id) setSelectedNodeId(null)
        }}
        onDropAgent={
          selectedTeam
            ? (agentId) => addMemberDirect.mutate(agentId)
            : undefined
        }
        onAddMember={
          selectedTeam
            ? () =>
                setAddMemberState({
                  open: true,
                  teamId: selectedTeam.id,
                  defaultAgentId: agentProfile?.ai_lenser_id,
                  initial: null,
                })
            : undefined
        }
        onManageEdges={
          selectedTeam
            ? () => setEdgesState({ open: true, team: selectedTeam })
            : undefined
        }
        onNodeEdit={(nodeId) => {
          const member = members.find((m) => m.id === nodeId)
          if (!member || !selectedTeam) return
          setAddMemberState({ open: true, teamId: selectedTeam.id, initial: member })
        }}
        onNodeRemove={(nodeId) =>
          setConfirmState({
            title: 'Remove member?',
            body: 'Remove this agent from the active builder team? This cannot be undone.',
            onConfirm: () => deleteMember.mutate(nodeId),
          })
        }
        agentPaletteSlot={
          <AgentPalettePanel
            agents={ownerFleetAgents}
            members={members}
            loading={ownerFleetAgentsLoading}
            disabled={!selectedTeam}
            onAdd={(agentId) =>
              selectedTeam
                ? setAddMemberState({
                    open: true,
                    teamId: selectedTeam.id,
                    defaultAgentId: agentId,
                    initial: null,
                  })
                : undefined
            }
            onCreateAgent={() => open('create-agent')}
          />
        }
        emptyState={{
          title: selectedTeam ? 'No members on this team yet' : 'No active team exists',
          description: selectedTeam
            ? 'Drag an agent from the palette or right-click the canvas to add a member.'
            : 'Create a team first, then connect agents on the canvas.',
          action: bootstrap ? (
            <Button
              type="button"
              variant="dark"
              onClick={() => setCreateTeamDialogOpen(true)}
            >
              Create team
            </Button>
          ) : undefined,
        }}
        sidePanel={
          <TeamContextualPanel
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            selectedTeam={selectedTeam}
            members={members}
            edges={teamEdges}
            teams={teamOptions}
            onTeamChange={setSelectedTeamId}
            onCreateTeam={() => setCreateTeamDialogOpen(true)}
            onDeleteTeam={() =>
              selectedTeam &&
              setConfirmState({
                title: 'Delete team?',
                body: `Delete "${selectedTeam.name}"? This cannot be undone.`,
                onConfirm: () => deleteTeam.mutate(selectedTeam.id),
              })
            }
            onRemoveMember={(memberId) =>
              setConfirmState({
                title: 'Remove member?',
                body: 'Remove this agent from the active builder team? This cannot be undone.',
                onConfirm: () => deleteMember.mutate(memberId),
              })
            }
            onAddMember={() =>
              selectedTeam &&
              setAddMemberState({
                open: true,
                teamId: selectedTeam.id,
                defaultAgentId: activeAiLenserId,
                initial: null,
              })
            }
            onSchedule={() => setScheduleDrawerOpen(true)}
            onAssignWorkflow={() => setWorkflowAssignmentOpen(true)}
            onManageAllEdges={() =>
              selectedTeam && setEdgesState({ open: true, team: selectedTeam })
            }
            onOpenAdvancedMember={(memberId) =>
              selectedTeam &&
              setAddMemberState({
                open: true,
                teamId: selectedTeam.id,
                initial: members.find((m) => m.id === memberId) ?? null,
              })
            }
            invalidate={invalidate}
            workflowsAvailable={workflows.length > 0}
          />
        }
      />

      <CreateTeamDialog
        open={createTeamDialogOpen && !!bootstrap}
        onClose={() => setCreateTeamDialogOpen(false)}
        aiLenserId={activeAiLenserId}
        onCreated={(team) => {
          setSelectedTeamId(team.id)
          invalidate()
          setCreateTeamDialogOpen(false)
        }}
      />

      <AddTeamMemberDrawer
        open={addMemberState.open}
        onClose={() => setAddMemberState((s) => ({ ...s, open: false }))}
        teamId={addMemberState.teamId}
        agents={ownerFleetAgents}
        defaultAgentId={addMemberState.defaultAgentId}
        initial={addMemberState.initial}
        onSaved={() => {
          invalidate()
          setAddMemberState((s) => ({ ...s, open: false }))
        }}
      />

      {selectedTeam && (
        <>
          <ScheduleDrawer
            open={scheduleDrawerOpen}
            onClose={() => setScheduleDrawerOpen(false)}
            workflows={workflows}
            ownerLenserId={agentProfile?.owner_lenser_id ?? profile.id}
            defaultAssigneeId={selectedTeam.id}
            defaultAssigneeType="team"
            teamOptions={teamOptions}
            onSaved={invalidate}
          />

          <WorkflowAssignmentDrawer
            open={workflowAssignmentOpen}
            onClose={() => setWorkflowAssignmentOpen(false)}
            aiLenserId={activeAiLenserId}
            workflows={workflows}
            teams={teamOptions}
            defaultAssigneeKind="team"
            defaultTeamId={selectedTeam.id}
            onSaved={() => {
              invalidate()
              setWorkflowAssignmentOpen(false)
            }}
          />
        </>
      )}

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
