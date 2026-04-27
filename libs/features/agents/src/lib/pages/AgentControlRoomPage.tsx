import { queryKeys } from '@lenserfight/data/cache'
import {
  agentWorkspaceService,
  agentsService,
  lenserService,
  workflowsService,
  type AgentProfileView,
  type WorkflowRecord,
} from '@lenserfight/data/repositories'
import { AICatalogShowroom } from '@lenserfight/features/generations'
import { useLenser, useLenserWorkspace } from '@lenserfight/features/profile'
import type {
  AgentMemoryProfileRecord,
  AgentPersonalityProfileRecord,
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
  AgentToolProfileRecord,
  AgentWorkspaceBootstrap,
  ProfileAccessPayload,
  WorkflowScheduleRecord,
} from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileStack,
  GitBranch,
  Sparkles,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

type AgentControlRoomSection =
  | 'overview'
  | 'scratchpad'
  | 'team'
  | 'workflows'
  | 'schedules'
  | 'memory'
  | 'personality'
  | 'tools'
  | 'models'
  | 'providers'
  | 'runs'
  | 'logs'
  | 'evaluations'
  | 'settings'

const VALID_SECTIONS = new Set<AgentControlRoomSection>([
  'overview',
  'scratchpad',
  'team',
  'workflows',
  'schedules',
  'memory',
  'personality',
  'tools',
  'models',
  'providers',
  'runs',
  'logs',
  'evaluations',
  'settings',
])

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-500/20 dark:from-[#1d160d] dark:via-[#101010] dark:to-[#180d08]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
      {children}
    </section>
  )
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-gray-300 bg-white/80 p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
      {children}
    </div>
  )
}

function TeamBoard({
  team,
  members,
  edges,
}: {
  team: AgentTeamRecord
  members: AgentTeamMemberRecord[]
  edges: AgentTeamEdgeRecord[]
}) {
  if (members.length <= 1) {
    const member = members[0]
    return (
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          Single agent operating view
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{team.name}</h3>
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{member?.role ?? 'Lead operator'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{member?.responsibility || 'Primary operator for this workspace.'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const lanes = Array.from(new Set(members.map((member) => member.lane))).sort((a, b) => a - b)

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Agent team graph</p>
          <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{team.name}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{edges.length} communication edges</p>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {lanes.map((lane) => (
          <div key={lane} className="rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Lane {lane + 1}</p>
            <div className="mt-4 space-y-3">
              {members
                .filter((member) => member.lane === lane)
                .map((member) => (
                  <div key={member.id} className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{member.role}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{member.responsibility || 'No responsibility set yet.'}</p>
                      </div>
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        Sort {member.sort_order}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      {edges.length > 0 && (
        <div className="mt-6 rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Delegation and handoff edges</p>
          <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {edges.map((edge) => (
              <div key={edge.id} className="flex items-center gap-2">
                <span className="font-medium">{edge.edge_type}</span>
                <ChevronRight size={14} className="text-gray-400" />
                <span>{edge.is_blocking ? 'blocking dependency' : 'parallel-safe handoff'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export const AgentControlRoomPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { handle, section } = useParams<{ handle: string; section?: string }>()
  const { lenser: activeWorkspace } = useLenser()
  const { workspaces, switchWorkspace, isSwitching } = useLenserWorkspace()

  const resolvedSection: AgentControlRoomSection =
    section && VALID_SECTIONS.has(section as AgentControlRoomSection)
      ? (section as AgentControlRoomSection)
      : 'overview'

  const { data: accessPayload = null, isLoading: accessLoading } = useQuery<ProfileAccessPayload | null>({
    queryKey: [...queryKeys.lenser.profile(handle ?? ''), 'agent-control-room'],
    queryFn: () => lenserService.getProfile(handle!),
    enabled: !!handle,
    staleTime: 60_000,
  })

  const viewedProfile = accessPayload?.profile ?? null
  const isOwner = useMemo(() => {
    if (!viewedProfile) return false
    return workspaces.some((workspace) => workspace.id === viewedProfile.id)
  }, [viewedProfile, workspaces])

  const { data: agentProfile = null, isLoading: agentLoading } = useQuery<AgentProfileView | null>({
    queryKey: queryKeys.agents.detailByProfile(viewedProfile?.id ?? ''),
    queryFn: () => agentsService.getAgentProfileByProfileId(viewedProfile!.id),
    enabled: !!viewedProfile?.id && viewedProfile.type === 'ai' && isOwner,
    staleTime: 60_000,
  })

  const shouldSwitchWorkspace = !!viewedProfile && activeWorkspace?.id !== viewedProfile.id

  const workspaceQuery = useQuery<AgentWorkspaceBootstrap | null>({
    queryKey: queryKeys.agents.workspaceBootstrap(handle ?? ''),
    queryFn: () => agentWorkspaceService.getWorkspaceBootstrap(handle!),
    enabled: !!handle && !!viewedProfile?.id && !!agentProfile && !shouldSwitchWorkspace,
    staleTime: 15_000,
  })

  const schedulesQuery = useQuery<WorkflowScheduleRecord[]>({
    queryKey: queryKeys.workflows.schedules(null),
    queryFn: () => workflowsService.getSchedules(),
    enabled: !!viewedProfile?.id && !shouldSwitchWorkspace,
    staleTime: 15_000,
  })

  const workflowsQuery = useQuery<WorkflowRecord[]>({
    queryKey: queryKeys.workflows.byLenser(viewedProfile?.id ?? ''),
    queryFn: () => workflowsService.listByLenser(viewedProfile!.id),
    enabled: !!viewedProfile?.id && !shouldSwitchWorkspace,
    staleTime: 60_000,
  })

  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [personalityName, setPersonalityName] = useState('Board Director')
  const [memoryName, setMemoryName] = useState('Team Memory')
  const [toolName, setToolName] = useState('Ops Toolbelt')

  const createTeam = useMutation({
    mutationFn: () =>
      agentWorkspaceService.createTeam({
        ai_lenser_id: workspaceQuery.data!.ai_lenser_id,
        agent_id: workspaceQuery.data!.ai_lenser_id,
        name: teamName.trim() || 'Executive Team',
        description: teamDescription.trim() || 'Primary autonomous team for this workspace.',
      }),
    onSuccess: async () => {
      setTeamName('')
      setTeamDescription('')
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.workspaceBootstrap(handle ?? '') })
    },
  })

  const createPersonality = useMutation({
    mutationFn: () =>
      agentWorkspaceService.createPersonalityProfile({
        ai_lenser_id: workspaceQuery.data!.ai_lenser_id,
        name: personalityName.trim() || 'Board Director',
        tone: 'decisive',
        expertise_level: 'specialist',
        risk_tolerance: 'moderate',
        autonomy_level: 'guided',
        communication_style: 'concise',
        decision_style: 'evidence_first',
        escalation_behavior: 'ask_when_blocked',
        system_prompt_patch: 'Keep outputs operational, concise, and escalation-aware.',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.workspaceBootstrap(handle ?? '') })
    },
  })

  const createMemory = useMutation({
    mutationFn: () =>
      agentWorkspaceService.createMemoryProfile({
        ai_lenser_id: workspaceQuery.data!.ai_lenser_id,
        name: memoryName.trim() || 'Team Memory',
        scope_type: 'team',
        isolation_mode: 'shared',
        retention_days: 30,
        visibility: 'private',
        summary_strategy: 'rolling_summary',
        reset_policy: 'manual',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.workspaceBootstrap(handle ?? '') })
    },
  })

  const createToolProfile = useMutation({
    mutationFn: () =>
      agentWorkspaceService.createToolProfile({
        ai_lenser_id: workspaceQuery.data!.ai_lenser_id,
        name: toolName.trim() || 'Ops Toolbelt',
        tool_groups: ['workflow', 'catalog', 'logging'],
        requires_approval: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.workspaceBootstrap(handle ?? '') })
    },
  })

  const createModelProfile = useMutation({
    mutationFn: (model: { provider_key: string; key: string; name: string; id: string; support_level: string }) =>
      agentWorkspaceService.createModelProfile({
        ai_lenser_id: workspaceQuery.data!.ai_lenser_id,
        name: `${model.name} profile`,
        provider_key: model.provider_key,
        model_key: model.key,
        model_id: model.id,
        support_level: model.support_level,
        params: { temperature: 0.4, maxTokens: 4096 },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.workspaceBootstrap(handle ?? '') })
    },
  })

  if (!handle) return <Navigate to="/" replace />

  if (!accessLoading && (!viewedProfile || viewedProfile.type !== 'ai' || !isOwner)) {
    return <Navigate to={`/lenser/${handle}`} replace />
  }

  if (accessLoading || agentLoading) {
    return <div className="py-20 text-center text-sm text-gray-500 dark:text-gray-400">Loading agent control room…</div>
  }

  if (shouldSwitchWorkspace && viewedProfile) {
    return (
      <SectionShell
        eyebrow="Switch workspace"
        title="Activate this agent workspace first"
        description="The control room is owner-only and runs against the currently active workspace. Switch into this AI lenser before managing teams, schedules, or memory."
      >
        <EmptyPanel
          icon={<Bot size={22} />}
          title={`Switch into @${viewedProfile.handle}`}
          description="Once this AI workspace is active, the sidebar and route tree will flip into agent mode and expose the full control-room navigation."
        >
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => switchWorkspace(viewedProfile.id)}
              disabled={isSwitching}
              className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {isSwitching ? 'Switching…' : 'Switch workspace'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/lenser/${viewedProfile.handle}`)}
              className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
            >
              Back to profile
            </button>
          </div>
        </EmptyPanel>
      </SectionShell>
    )
  }

  const bootstrap = workspaceQuery.data
  const schedules = schedulesQuery.data ?? []
  const workflows = workflowsQuery.data ?? []
  const teams = bootstrap?.teams ?? []
  const activeTeam = teams[0] ?? null
  const activeMembers = (activeTeam?.members as AgentTeamMemberRecord[] | undefined) ?? []
  const activeEdges = (activeTeam?.edges as AgentTeamEdgeRecord[] | undefined) ?? []
  const blockedRuns = (bootstrap?.runs ?? []).filter((run) => run.status === 'blocked').length
  const approvalBacklog = (bootstrap?.runs ?? []).filter((run) => run.approval_status === 'pending').length
  const scheduleHealth =
    schedules.length === 0
      ? 'No schedules'
      : schedules.some((schedule) => schedule.last_dispatch_status === 'dispatch_failed')
        ? 'Needs attention'
        : 'Healthy'

  const renderOverview = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Teams" value={String(teams.length)} detail="Parallel operator groups configured for this workspace." />
        <StatCard label="Runs" value={String(bootstrap?.runs.length ?? 0)} detail="Recent persisted control-room runs." />
        <StatCard label="Approvals" value={String(approvalBacklog)} detail="Pending human approval gates." />
        <StatCard label="Schedules" value={String(schedules.length)} detail={`Scheduler status: ${scheduleHealth}.`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {activeTeam ? (
          <TeamBoard team={activeTeam} members={activeMembers} edges={activeEdges} />
        ) : (
          <EmptyPanel
            icon={<Bot size={22} />}
            title="Create your first agent team"
            description="Start with one lead operator, then expand into specialist lanes for review, delegation, or parallel execution."
          >
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Executive Team"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => createTeam.mutate()}
                disabled={createTeam.isPending || !bootstrap}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                {createTeam.isPending ? 'Creating…' : 'Create team'}
              </button>
            </div>
          </EmptyPanel>
        )}
        <div className="space-y-6">
          <ProfileCard title="Runtime Header" subtitle="The control room emphasizes execution state instead of profile vanity.">
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Workspace</span>
                <span className="font-semibold text-gray-900 dark:text-white">@{viewedProfile?.handle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Run blockers</span>
                <span className="font-semibold text-gray-900 dark:text-white">{blockedRuns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Scheduler health</span>
                <span className="font-semibold text-gray-900 dark:text-white">{scheduleHealth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Default runtime</span>
                <span className="font-semibold text-gray-900 dark:text-white">{agentProfile?.runtime_pref ?? 'unknown'}</span>
              </div>
            </div>
          </ProfileCard>
          <ProfileCard title="Next actions" subtitle="Recommended setup sequence for a usable multi-agent workspace.">
            <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li>1. Create a team and assign lanes for delegation.</li>
              <li>2. Define personality and memory profiles.</li>
              <li>3. Bind a model profile and tool profile.</li>
              <li>4. Attach workflows and activate CRON schedules.</li>
            </ol>
          </ProfileCard>
        </div>
      </div>
    </>
  )

  const renderScratchpad = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <ProfileCard title="Agent scratchpad" subtitle="Structured working state only. No hidden chain-of-thought is surfaced here.">
        {activeTeam?.scratchpad && Object.keys(activeTeam.scratchpad).length > 0 ? (
          <pre className="overflow-x-auto rounded-2xl bg-gray-950 p-4 text-xs leading-6 text-amber-100">
            {JSON.stringify(activeTeam.scratchpad, null, 2)}
          </pre>
        ) : (
          <EmptyPanel
            icon={<FileStack size={20} />}
            title="No scratchpad summaries yet"
            description="This area is reserved for objectives, recent decisions, pending approvals, and artifact summaries once runs start persisting control-room state."
          />
        )}
      </ProfileCard>
      <ProfileCard title="Current operating assumptions" subtitle="Human-readable summaries of how this workspace behaves.">
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Memory isolation</p>
            <p className="mt-1">{bootstrap?.profiles.memory.length ? 'Explicit memory profiles are configured.' : 'No explicit memory profile yet; runs remain isolated by default.'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Approval policy</p>
            <p className="mt-1">{approvalBacklog > 0 ? `${approvalBacklog} run(s) are waiting on approval.` : 'No approval backlog is currently blocking execution.'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Parallel execution</p>
            <p className="mt-1">{activeMembers.length > 1 ? 'Multiple agent lanes are configured for parallel work.' : 'Only one active operator is configured right now.'}</p>
          </div>
        </div>
      </ProfileCard>
    </div>
  )

  const renderTeam = () => (
    <div className="space-y-6">
      {activeTeam ? (
        <TeamBoard team={activeTeam} members={activeMembers} edges={activeEdges} />
      ) : (
        <EmptyPanel
          icon={<Bot size={22} />}
          title="No active team exists"
          description="Create a named team to unlock the board-style graph, delegation lanes, and team-targeted schedules."
        >
          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Executive Team"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <input
              value={teamDescription}
              onChange={(event) => setTeamDescription(event.target.value)}
              placeholder="Primary autonomous team for this workspace"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => createTeam.mutate()}
              disabled={createTeam.isPending || !bootstrap}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {createTeam.isPending ? 'Creating…' : 'Create team'}
            </button>
          </div>
        </EmptyPanel>
      )}
    </div>
  )

  const renderWorkflows = () => (
    <div className="space-y-4">
      {workflows.length === 0 ? (
        <EmptyPanel
          icon={<GitBranch size={20} />}
          title="No workflows assigned yet"
          description="Workflows become the operational units that teams run manually, on CRON schedules, or behind approval gates."
        />
      ) : (
        workflows.map((workflow) => (
          <div key={workflow.id} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{workflow.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{workflow.description || 'No workflow description yet.'}</p>
              </div>
              <Link
                to={`/workflows/${workflow.id}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
              >
                Open builder <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderSchedules = () => (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <EmptyPanel
          icon={<CalendarClock size={20} />}
          title="No schedules yet"
          description="Use workflow schedules to dispatch manual, CRON-based, or team-assigned automation runs."
        />
      ) : (
        schedules.map((schedule) => (
          <div key={schedule.id} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{schedule.workflow_title}</h3>
                  <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {schedule.assignee_type}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {schedule.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm text-gray-700 dark:text-gray-200">{schedule.cron_expr}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Next run: {formatDateTime(schedule.next_run_at)} · Timezone: {schedule.timezone}
                </p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last status: <span className="font-semibold text-gray-900 dark:text-white">{schedule.last_dispatch_status ?? 'never dispatched'}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderRecordList = <T extends { id: string }>(
    items: T[],
    emptyTitle: string,
    emptyDescription: string,
    getTitle: (item: T) => string
  ) => {
    if (items.length === 0) {
      return <EmptyPanel icon={<ClipboardList size={20} />} title={emptyTitle} description={emptyDescription} />
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getTitle(item)}</h3>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-gray-950 p-4 text-xs leading-6 text-amber-100">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    )
  }

  const contentBySection: Record<AgentControlRoomSection, React.ReactNode> = {
    overview: renderOverview(),
    scratchpad: renderScratchpad(),
    team: renderTeam(),
    workflows: renderWorkflows(),
    schedules: renderSchedules(),
    memory: (
      <div className="space-y-6">
        <ProfileCard title="Create memory profile" subtitle="Control whether runs share context, how long memory survives, and who can see it.">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={memoryName}
              onChange={(event) => setMemoryName(event.target.value)}
              placeholder="Team Memory"
              className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => createMemory.mutate()}
              disabled={createMemory.isPending || !bootstrap}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {createMemory.isPending ? 'Saving…' : 'Create memory profile'}
            </button>
          </div>
        </ProfileCard>
        {renderRecordList<AgentMemoryProfileRecord>(
          bootstrap?.profiles.memory ?? [],
          'No memory profiles yet',
          'Define short-term, long-term, or shared team memory before enabling collaborative runs.',
          (item) => item.name
        )}
      </div>
    ),
    personality: (
      <div className="space-y-6">
        <ProfileCard title="Create personality profile" subtitle="Set communication style, autonomy, escalation behavior, and decision posture.">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={personalityName}
              onChange={(event) => setPersonalityName(event.target.value)}
              placeholder="Board Director"
              className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => createPersonality.mutate()}
              disabled={createPersonality.isPending || !bootstrap}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {createPersonality.isPending ? 'Saving…' : 'Create personality profile'}
            </button>
          </div>
        </ProfileCard>
        {renderRecordList<AgentPersonalityProfileRecord>(
          bootstrap?.profiles.personality ?? [],
          'No personality profiles yet',
          'Profiles let owners tune tone, expertise, autonomy, and escalation rules per workflow or team.',
          (item) => item.name
        )}
      </div>
    ),
    tools: (
      <div className="space-y-6">
        <ProfileCard title="Create tool profile" subtitle="Restrict tool groups, set approval requirements, and keep side effects behind clear gates.">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={toolName}
              onChange={(event) => setToolName(event.target.value)}
              placeholder="Ops Toolbelt"
              className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => createToolProfile.mutate()}
              disabled={createToolProfile.isPending || !bootstrap}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {createToolProfile.isPending ? 'Saving…' : 'Create tool profile'}
            </button>
          </div>
        </ProfileCard>
        {renderRecordList<AgentToolProfileRecord>(
          bootstrap?.profiles.tools ?? [],
          'No tool profiles yet',
          'Tool profiles should define allow and deny lists instead of relying on prompt instructions alone.',
          (item) => item.name
        )}
      </div>
    ),
    models: (
      <AICatalogShowroom
        embedded
        focus="models"
        title="Agent model showroom"
        onModelSelect={(model) =>
          createModelProfile.mutate({
            id: model.id,
            key: model.key,
            name: model.name,
            provider_key: model.provider_key,
            support_level: model.support_level,
          })
        }
      />
    ),
    providers: <AICatalogShowroom embedded focus="providers" title="Provider showroom" />,
    runs: renderRecordList(
      bootstrap?.runs ?? [],
      'No team runs yet',
      'Scheduled or manual control-room runs will appear here once execution begins.',
      (item) => `Run ${item.id.slice(0, 8)} · ${'status' in item ? String(item.status) : 'unknown'}`
    ),
    logs: renderRecordList(
      bootstrap?.runs ?? [],
      'No logs yet',
      'The current control-room bootstrap only contains recent run summaries. Detailed event logs can hang off the persisted run event stream next.',
      (item) => `Run ${item.id.slice(0, 8)} log summary`
    ),
    evaluations: (
      <EmptyPanel
        icon={<Sparkles size={20} />}
        title="Evaluations surface is ready for scoring"
        description="This section is reserved for model and workflow eval runs, scorecards, and release-readiness comparisons once evaluator pipelines are wired in."
      />
    ),
    settings: (
      <ProfileCard title="Workspace settings" subtitle="Operational configuration is separated from public profile identity in the control room.">
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center justify-between">
            <span>Workspace handle</span>
            <span className="font-semibold text-gray-900 dark:text-white">@{viewedProfile?.handle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Agent runtime</span>
            <span className="font-semibold text-gray-900 dark:text-white">{agentProfile?.runtime_pref ?? 'unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last control-room refresh</span>
            <span className="font-semibold text-gray-900 dark:text-white">{formatDateTime(new Date().toISOString())}</span>
          </div>
        </div>
      </ProfileCard>
    ),
  }

  return (
    <SectionShell
      eyebrow="Agent Workspace"
      title="Agent control room"
      description="This workspace is optimized for autonomous and semi-autonomous execution: teams, schedules, memory profiles, tool gates, provider routing, and run state are all exposed as operational controls instead of profile tabs."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active team" value={activeTeam ? activeTeam.name : 'None'} detail={activeTeam ? `${activeMembers.length} members in the lead team.` : 'Create a first team to unlock parallel lanes.'} />
        <StatCard label="Approvals" value={String(approvalBacklog)} detail="Outbound side effects should pause here until a human approves." />
        <StatCard label="Schedules" value={scheduleHealth} detail={`${schedules.length} workflow schedules currently registered.`} />
        <StatCard label="Default profile" value={agentProfile?.runtime_pref ?? 'n/a'} detail="Current runtime preference for this AI workspace." />
      </div>
      {workspaceQuery.error && (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Workspace bootstrap failed</p>
              <p className="mt-1">
                The control-room RPC did not return bootstrap data. Review the migration, RLS, and ownership helpers before relying on this workspace in production.
              </p>
            </div>
          </div>
        </div>
      )}
      {contentBySection[resolvedSection]}
    </SectionShell>
  )
}
