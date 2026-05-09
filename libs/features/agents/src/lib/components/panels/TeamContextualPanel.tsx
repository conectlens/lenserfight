import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type {
  AgentTeamEdgeRecord,
  AgentTeamEdgeType,
  AgentTeamMemberRecord,
  AgentTeamRecord,
} from '@lenserfight/types'
import { useMutation } from '@tanstack/react-query'
import {
  Bot,
  ChevronDown,
  ExternalLink,
  GitMerge,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface TeamContextualPanelProps {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedTeam: (AgentTeamRecord & { member_count?: number; members?: AgentTeamMemberRecord[]; edges?: AgentTeamEdgeRecord[] }) | null
  members: AgentTeamMemberRecord[]
  edges: AgentTeamEdgeRecord[]
  teams: Array<{ id: string; name: string }>
  onTeamChange: (id: string) => void
  onCreateTeam: () => void
  onDeleteTeam: () => void
  onRemoveMember: (memberId: string) => void
  onAddMember: () => void
  onSchedule: () => void
  onAssignWorkflow: () => void
  onManageAllEdges: () => void
  onOpenAdvancedMember: (memberId: string) => void
  invalidate: () => void
  workflowsAvailable?: boolean
}

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'leader',   label: 'Leader'   },
  { value: 'executor', label: 'Executor' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'operator', label: 'Operator' },
  { value: 'observer', label: 'Observer' },
]

const EDGE_TYPE_OPTIONS: Array<{ value: AgentTeamEdgeType; label: string }> = [
  { value: 'delegates',      label: 'Delegates'      },
  { value: 'reviews',        label: 'Reviews'        },
  { value: 'reports_to',     label: 'Reports to'     },
  { value: 'shares_context', label: 'Shares context' },
  { value: 'handoff',        label: 'Handoff'        },
]

export const TeamContextualPanel: React.FC<TeamContextualPanelProps> = ({
  selectedNodeId,
  selectedEdgeId,
  selectedTeam,
  members,
  edges,
  teams,
  onTeamChange,
  onCreateTeam,
  onDeleteTeam,
  onRemoveMember,
  onAddMember,
  onSchedule,
  onAssignWorkflow,
  onManageAllEdges,
  onOpenAdvancedMember,
  invalidate,
  workflowsAvailable,
}) => {
  const selectedMember = selectedNodeId ? members.find((m) => m.id === selectedNodeId) ?? null : null
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) ?? null : null

  if (selectedMember) {
    return (
      <NodeInspector
        member={selectedMember}
        members={members}
        teamId={selectedTeam?.id ?? ''}
        onAdvanced={() => onOpenAdvancedMember(selectedMember.id)}
        onRemove={() => onRemoveMember(selectedMember.id)}
        invalidate={invalidate}
      />
    )
  }

  if (selectedEdge) {
    return (
      <EdgeInspector
        edge={selectedEdge}
        members={members}
        onManageAll={onManageAllEdges}
        invalidate={invalidate}
      />
    )
  }

  return (
    <DefaultPanel
      selectedTeam={selectedTeam}
      members={members}
      edges={edges}
      teams={teams}
      onTeamChange={onTeamChange}
      onCreateTeam={onCreateTeam}
      onDeleteTeam={onDeleteTeam}
      onAddMember={onAddMember}
      onSchedule={onSchedule}
      onAssignWorkflow={onAssignWorkflow}
      onManageAllEdges={onManageAllEdges}
      workflowsAvailable={workflowsAvailable}
    />
  )
}

// ─── Default Panel ────────────────────────────────────────────────────────────

const DefaultPanel: React.FC<{
  selectedTeam: (AgentTeamRecord & { member_count?: number }) | null
  members: AgentTeamMemberRecord[]
  edges: AgentTeamEdgeRecord[]
  teams: Array<{ id: string; name: string }>
  onTeamChange: (id: string) => void
  onCreateTeam: () => void
  onDeleteTeam: () => void
  onAddMember: () => void
  onSchedule: () => void
  onAssignWorkflow: () => void
  onManageAllEdges: () => void
  workflowsAvailable?: boolean
}> = ({
  selectedTeam, members, edges, teams,
  onTeamChange, onCreateTeam, onDeleteTeam,
  onAddMember, onSchedule, onAssignWorkflow, onManageAllEdges,
  workflowsAvailable,
}) => {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Team switcher */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Team</h3>
          <button
            type="button"
            onClick={onCreateTeam}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={12} />
            New team
          </button>
        </div>

        <select
          value={selectedTeam?.id ?? ''}
          onChange={(e) => onTeamChange(e.target.value)}
          className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">Select a team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {selectedTeam && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <StatPill label="Members" value={String(members.length)} />
            <StatPill label="Edges" value={String(edges.length)} />
            <StatPill
              label="Mode"
              value={selectedTeam.is_active ? 'Active' : 'Draft'}
              highlight={selectedTeam.is_active}
            />
          </div>
        )}
      </Card>

      {/* Quick actions */}
      {selectedTeam && (
        <Card title="Actions">
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn icon={<UserPlus size={13} />} label="Add member" onClick={onAddMember} />
            <ActionBtn icon={<GitMerge size={13} />} label="All edges" onClick={onManageAllEdges} />
            <ActionBtn
              label="Schedule"
              onClick={onSchedule}
              disabled={!workflowsAvailable}
            />
            <ActionBtn
              label="Assign workflow"
              onClick={onAssignWorkflow}
              disabled={!workflowsAvailable}
            />
          </div>
          <button
            type="button"
            onClick={onDeleteTeam}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <Trash2 size={13} />
            Delete team
          </button>
        </Card>
      )}

      {!selectedTeam && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Bot size={24} className="text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a team to start building your AI agent topology.
            </p>
          </div>
        </Card>
      )}

      {/* Help footer */}
      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-600 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
      >
        <span className="font-medium">Builder vs Workflows</span>
        <ChevronDown
          size={14}
          className={['transition-transform', helpOpen ? 'rotate-180' : ''].join(' ')}
        />
      </button>
      {helpOpen && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
          <p>
            <strong className="text-gray-900 dark:text-white">Builder</strong> is the live team
            canvas — who participates, who reviews, and how work is handed off.
          </p>
          <p className="mt-2">
            <strong className="text-gray-900 dark:text-white">Workflows</strong> are reusable
            automation logic, schedules, and run entry points assigned to a team.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Node Inspector ───────────────────────────────────────────────────────────

const NodeInspector: React.FC<{
  member: AgentTeamMemberRecord
  members: AgentTeamMemberRecord[]
  teamId: string
  onAdvanced: () => void
  onRemove: () => void
  invalidate: () => void
}> = ({ member, teamId, onAdvanced, onRemove, invalidate }) => {
  const [role, setRole] = useState(member.role)
  const [responsibility, setResponsibility] = useState(member.responsibility ?? '')
  const [lane, setLane] = useState(member.lane)
  const [sortOrder, setSortOrder] = useState(member.sort_order)

  useEffect(() => {
    setRole(member.role)
    setResponsibility(member.responsibility ?? '')
    setLane(member.lane)
    setSortOrder(member.sort_order)
  }, [member])

  const updateMember = useMutation({
    mutationFn: (patch: Parameters<typeof agentWorkspaceService.updateTeamMember>[1]) =>
      agentWorkspaceService.updateTeamMember(member.id, patch),
    onSuccess: invalidate,
    onError: (err) => toast.error((err as Error).message),
  })

  const handleRoleChange = (newRole: string) => {
    setRole(newRole)
    updateMember.mutate({ role: newRole })
  }

  const handleResponsibilitySave = () => {
    if (responsibility !== member.responsibility) {
      updateMember.mutate({ responsibility })
    }
  }

  const handleLaneBlur = () => {
    if (lane !== member.lane) updateMember.mutate({ lane })
  }

  const handleSortBlur = () => {
    if (sortOrder !== member.sort_order) updateMember.mutate({ sort_order: sortOrder })
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Member</p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {member.role.replace(/_/g, ' ')}
            </h3>
          </div>
          {member.agent_id && (
            <a
              href={`#`}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 transition hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
            >
              View agent <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Role selector */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Role
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRoleChange(opt.value)}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  role === opt.value
                    ? 'bg-amber-400 text-white dark:bg-amber-500'
                    : 'border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsibility */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Responsibility
          </label>
          <textarea
            value={responsibility}
            onChange={(e) => setResponsibility(e.target.value)}
            onBlur={handleResponsibilitySave}
            rows={3}
            placeholder="Describe this agent's responsibility..."
            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        {/* Lane / Sort */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Lane
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={lane}
              onChange={(e) => setLane(Number(e.target.value))}
              onBlur={handleLaneBlur}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Order
            </label>
            <input
              type="number"
              min={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              onBlur={handleSortBlur}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdvanced}
          className="flex-1 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-300"
        >
          Advanced settings
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex-1 rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

// ─── Edge Inspector ───────────────────────────────────────────────────────────

const EdgeInspector: React.FC<{
  edge: AgentTeamEdgeRecord
  members: AgentTeamMemberRecord[]
  onManageAll: () => void
  invalidate: () => void
}> = ({ edge, members, onManageAll, invalidate }) => {
  const [edgeType, setEdgeType] = useState<AgentTeamEdgeType>(edge.edge_type)
  const [isBlocking, setIsBlocking] = useState(edge.is_blocking)

  useEffect(() => {
    setEdgeType(edge.edge_type)
    setIsBlocking(edge.is_blocking)
  }, [edge])

  const upsertEdge = useMutation({
    mutationFn: (patch: { edge_type?: AgentTeamEdgeType; is_blocking?: boolean }) =>
      agentWorkspaceService.upsertTeamEdge({
        team_id: edge.team_id,
        source_member_id: edge.source_member_id,
        target_member_id: edge.target_member_id,
        edge_type: patch.edge_type ?? edgeType,
        is_blocking: patch.is_blocking ?? isBlocking,
      }),
    onSuccess: invalidate,
    onError: (err) => toast.error((err as Error).message),
  })

  const deleteEdge = useMutation({
    mutationFn: () => agentWorkspaceService.deleteTeamEdge(edge.id),
    onSuccess: invalidate,
    onError: (err) => toast.error((err as Error).message),
  })

  const handleEdgeTypeChange = (type: AgentTeamEdgeType) => {
    setEdgeType(type)
    upsertEdge.mutate({ edge_type: type })
  }

  const handleBlockingToggle = () => {
    const next = !isBlocking
    setIsBlocking(next)
    upsertEdge.mutate({ is_blocking: next })
  }

  const source = members.find((m) => m.id === edge.source_member_id)
  const target = members.find((m) => m.id === edge.target_member_id)

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Relationship</p>
        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
          {source?.role.replace(/_/g, ' ') ?? '—'}{' '}
          <span className="text-gray-400">→</span>{' '}
          {target?.role.replace(/_/g, ' ') ?? '—'}
        </p>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Edge type
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EDGE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleEdgeTypeChange(opt.value)}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  edgeType === opt.value
                    ? 'bg-amber-400 text-white dark:bg-amber-500'
                    : 'border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Blocking</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Downstream agents wait for this edge to resolve
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isBlocking}
            onClick={handleBlockingToggle}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition focus-visible:ring-2',
              isBlocking ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform',
                isBlocking ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
      </Card>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onManageAll}
          className="flex-1 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-300"
        >
          All edges
        </button>
        <button
          type="button"
          onClick={() => deleteEdge.mutate()}
          disabled={deleteEdge.isPending}
          className="flex-1 rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          Delete edge
        </button>
      </div>
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const Card: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    {title && (
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
    )}
    {children}
  </div>
)

const StatPill: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label, value, highlight,
}) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/50">
    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
    <p className={['mt-0.5 text-sm font-bold', highlight ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'].join(' ')}>
      {value}
    </p>
  </div>
)

const ActionBtn: React.FC<{
  icon?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}> = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
  >
    {icon}
    {label}
  </button>
)
