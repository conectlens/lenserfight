import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useLenserWorkspace } from '@lenserfight/features/profile'
import { HelpButton } from '@lenserfight/ui/components'
import { useModalRouter } from '@lenserfight/ui/routing'
import { useQuery } from '@tanstack/react-query'
import {
  Brain,
  GitBranch,
  Network,
  Sparkles,
} from 'lucide-react'
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AgentsGrid } from '../AgentsGrid'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { CrossAgentActivityFeed } from '../CrossAgentActivityFeed'
import { EmptyPanel } from '../EmptyPanel'
import { ActiveRunsPanel } from '../ActiveRunsPanel'
import { KillSwitchBanner } from '../KillSwitchBanner'
import { PolicyDenyLog } from '../PolicyDenyLog'
import { RecentIncidentsFeed } from '../RecentIncidentsFeed'
import { useRunUnified } from '../../hooks/useRunUnified'
import { useWorkspaceControls } from '../../hooks/useWorkspaceControls'

import { ProfileCard, StatCard } from './_shared'
import { SectionPage } from './SectionPage'

import type { AgentWorkspaceBootstrap, FleetOverview } from '@lenserfight/types'

export const OverviewSection: React.FC = () => {
  const ctx = useAgentWorkspace()
  const {
    viewMode,
    profile,
    bootstrap,
    bootstrapState,
    workflows,
    schedules,
    ownerFleetAgents,
    ownerFleetAgentsLoading,
    defaultInstructionBinding,
  } = ctx
  const { open } = useModalRouter()

  // Phase 8: Autonomous Agent OS — hooks must be called unconditionally
  const agentId = bootstrap?.ai_lenser_id ?? ''
  const controls = useWorkspaceControls(agentId)
  const { data: runUnifiedData } = useRunUnified(agentId, { limit: 20 })

  if (viewMode === 'human_owner') {
    return <HumanOwnerOverview />
  }

  if (viewMode === 'human_public') {
    const publicAgents = ownerFleetAgents.filter(
      (agent) => agent.is_active && !agent.suspended_at
    )
    return (
      <SectionPage
        eyebrow="Public agents"
        title={`Agents by @${profile.handle}`}
        description="A read-only view of the public AI lensers published by this profile."
      >
        {ownerFleetAgentsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              />
            ))}
          </div>
        ) : (
          <AgentsGrid agents={publicAgents} mode="public" />
        )}
      </SectionPage>
    )
  }

  if (viewMode === 'agent_public') {
    const activeTeams = bootstrap?.teams.filter((team) => team.is_active).length ?? 0
    return (
      <SectionPage
        eyebrow="Agent overview"
        title={profile.display_name || `@${profile.handle}`}
        description="Public profile surface for this AI lenser. Operational editing, builder access, and approval controls remain owner-only."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Instruction"
            value={defaultInstructionBinding ? 'Bound' : 'Unset'}
            detail="Default instruction source for owner-initiated runs."
          />
          <StatCard
            label="Workflows"
            value={String(workflows.length)}
            detail="Published and private workflow count visible to this viewer."
          />
          <StatCard
            label="Schedules"
            value={String(schedules.length)}
            detail="Scheduled workflow triggers attached to this agent."
          />
          <StatCard
            label="Builder"
            value={String(activeTeams)}
            detail="Active team graph count managed by the owner."
          />
        </div>
      </SectionPage>
    )
  }

  const teams = bootstrap?.teams ?? []
  const activeTeam = teams.find((team) => team.is_active) ?? teams[0] ?? null
  const blockedRuns = (bootstrap?.runs ?? []).filter(
    (run) => run.status === 'blocked'
  ).length
  const pendingApprovals = (bootstrap?.runs ?? []).filter(
    (run) => run.approval_status === 'pending'
  ).length
  const defaultModelProfile =
    (bootstrap?.profiles.models ?? []).find((profileRecord) => profileRecord.is_default) ??
    bootstrap?.profiles.models?.[0] ??
    null
  const scheduleHealth =
    schedules.length === 0
      ? 'No schedules'
      : schedules.some((schedule) => schedule.last_dispatch_status === 'dispatch_failed')
        ? 'Needs attention'
        : 'Healthy'

  const activeRunCount = (runUnifiedData ?? []).filter((r) =>
    ['queued', 'running', 'blocked'].includes(r.status)
  ).length
  const killSwitchActive =
    (bootstrap as (AgentWorkspaceBootstrap & { settings?: { global_kill_switch?: boolean } }) | null)
      ?.settings?.global_kill_switch ?? false

  return (
    <SectionPage
      eyebrow="Agent control room"
      title={`@${profile.handle}`}
      description="Operational home for this AI lenser. Keep the default instruction source, active builder graph, workflow library, approvals, and runtime health aligned here."
      toolbar={
        <div className="flex flex-wrap gap-2">
          <HelpButton path="/tutorials/agent-walkthroughs/create-your-first-agent" />
          <Link
            to={`/lenser/${profile.handle}/ag/scratchpad`}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Brain size={14} />
            Open workbench
          </Link>
          <Link
            to={`/lenser/${profile.handle}/ag/team`}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
          >
            <Network size={14} />
            Open builder
          </Link>
        </div>
      }
    >
      <BootstrapStatusPanel state={bootstrapState} />

      {killSwitchActive && (
        <KillSwitchBanner
          aiLenserId={agentId}
          onResume={() => controls.toggleKillSwitch.mutate(false)}
          isPending={controls.toggleKillSwitch.isPending}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Instruction"
          value={defaultInstructionBinding ? 'Bound' : 'Unset'}
          detail="Lens-version-backed instruction source."
          action={
            !defaultInstructionBinding ? (
              <Link
                to={`/lenser/${profile.handle}/ag/instructions`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-500/10"
              >
                <Sparkles size={11} />
                Set instruction
              </Link>
            ) : undefined
          }
        />
        <StatCard
          label="Builder"
          value={String(teams.length)}
          detail={`${activeTeam ? activeTeam.name : 'No active team'} in focus.`}
        />
        <StatCard
          label="Workflows"
          value={String(workflows.length)}
          detail={`${pendingApprovals} approval gate${pendingApprovals === 1 ? '' : 's'} pending.`}
        />
        <StatCard
          label="Schedules"
          value={String(schedules.length)}
          detail={`Scheduler health: ${scheduleHealth}.`}
        />
        <StatCard
          label="Active Runs"
          value={String(activeRunCount)}
          detail={`${pendingApprovals} approval gate${pendingApprovals === 1 ? '' : 's'} pending.`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActiveRunsPanel aiLenserId={agentId} />
        <RecentIncidentsFeed aiLenserId={agentId} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard
          title="Next actions"
          subtitle="Use the control room surfaces intentionally so users are not forced through duplicated concepts."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickLinkCard
              to={`/lenser/${profile.handle}/ag/instructions`}
              icon={<Sparkles size={16} />}
              title="Instructions"
              description="Bind a default instruction lens version."
            />
            <QuickLinkCard
              to={`/lenser/${profile.handle}/ag/scratchpad`}
              icon={<Brain size={16} />}
              title="Scratchpad"
              description="Test ideas privately on the solo workbench."
            />
            <QuickLinkCard
              to={`/lenser/${profile.handle}/ag/team`}
              icon={<Network size={16} />}
              title="Builder"
              description="Shape the live multi-agent graph and handoffs."
            />
            <QuickLinkCard
              to={`/lenser/${profile.handle}/ag/workflows`}
              icon={<GitBranch size={16} />}
              title="Workflows"
              description="Manage the saved automation library and assignments."
            />
          </div>
        </ProfileCard>

        <PolicyDenyLog aiLenserId={agentId} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <ProfileCard
          title="Runtime defaults"
          subtitle="The selected agent's baseline behavior before a workflow overrides it."
        >
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <Row
              label="Instruction source"
              value={
                defaultInstructionBinding
                  ? `Lens ${defaultInstructionBinding.lens_id.slice(0, 8)}`
                  : 'Not configured'
              }
            />
            <Row
              label="Default model profile"
              value={defaultModelProfile?.name ?? 'Not configured'}
            />
            <Row label="Blocked runs" value={String(blockedRuns)} />
            <Row label="Pending approvals" value={String(pendingApprovals)} />
          </div>
        </ProfileCard>

        <ProfileCard
          title="Builder focus"
          subtitle="Builder owns the live agent graph. Workflows stay in the library surface."
        >
          {activeTeam ? (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <Row label="Active team" value={activeTeam.name} />
              <Row label="Members" value={String(activeTeam.member_count ?? 0)} />
              <Row
                label="Edges"
                value={String((activeTeam.edges ?? []).length)}
              />
              <Link
                to={`/lenser/${profile.handle}/ag/team`}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
              >
                Open builder
              </Link>
            </div>
          ) : (
            <EmptyPanel
              icon={<Network size={20} />}
              title="No active team exists"
              description="Open Builder to create the first team graph and connect agents into a professional workflow topology."
            />
          )}
        </ProfileCard>
      </div>

      <ProfileCard
        title="Your agents"
        subtitle="All AI lensers you own. Open one to enter its control room."
        toolbar={
          <button
            type="button"
            onClick={() => open('create-agent')}
            className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
          >
            Create agent
          </button>
        }
      >
        {ownerFleetAgentsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              />
            ))}
          </div>
        ) : (
          <AgentsGrid
            agents={ownerFleetAgents}
            mode="owner"
            onCreateAgent={() => open('create-agent')}
          />
        )}
      </ProfileCard>
    </SectionPage>
  )
}

const HumanOwnerOverview: React.FC = () => {
  const { profile, ownerFleetAgents, ownerFleetAgentsLoading } = useAgentWorkspace()
  const { humanWorkspace } = useLenserWorkspace()
  const { open } = useModalRouter()
  const navigate = useNavigate()
  const feedLenserId = humanWorkspace?.id ?? profile.id

  const overview = useQuery<FleetOverview | null>({
    queryKey: queryKeys.agents.fleetOverview(feedLenserId),
    queryFn: () => agentWorkspaceService.getFleetOverview(feedLenserId),
    enabled: !!feedLenserId,
    staleTime: 30_000,
  })

  const overviewReady = !overview.isLoading && !ownerFleetAgentsLoading
  const totalAgents = overviewReady
    ? (overview.data?.agents_total ?? ownerFleetAgents.length)
    : null
  const activeAgents = overviewReady
    ? (overview.data?.agents_active ?? ownerFleetAgents.filter((a) => a.is_active && !a.suspended_at).length)
    : null

  return (
    <SectionPage
      eyebrow="Your agent fleet"
      title={`@${profile.handle}`}
      description="Fleet-level owner surface for the human workspace. Create new agents here and audit recent cross-agent activity without dropping into a single AI lenser."
      toolbar={
        <button
          type="button"
          onClick={() => open('create-agent')}
          className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
        >
          Create agent
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Agents"
          value={totalAgents !== null ? String(totalAgents) : '...'}
          detail="Total AI lensers owned by this human workspace."
        />
        <StatCard
          label="Active"
          value={activeAgents !== null ? String(activeAgents) : '...'}
          detail="Currently active and not suspended."
        />
        <StatCard
          label="Runs (24h)"
          value={overview.isLoading ? '...' : String(overview.data?.runs_24h ?? 0)}
          detail="Team runs dispatched across the fleet."
        />
        <StatCard
          label="Approvals"
          value={overview.isLoading ? '...' : String(overview.data?.approvals_pending ?? 0)}
          detail="Pending owner approval gates."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProfileCard
          title="Agents"
          subtitle="Create or jump into any AI lenser you own."
          toolbar={
            <button
              type="button"
              onClick={() => navigate('/lensers?type=ai')}
              className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
            >
              Browse all
            </button>
          }
        >
          {ownerFleetAgentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                />
              ))}
            </div>
          ) : (
            <AgentsGrid
              agents={ownerFleetAgents}
              mode="owner"
              onCreateAgent={() => open('create-agent')}
            />
          )}
        </ProfileCard>

        <ProfileCard
          title="Cross-agent activity"
          subtitle="Recent approvals, runs, and scheduled dispatches across every owned AI lenser."
        >
          <CrossAgentActivityFeed humanLenserId={feedLenserId} limit={25} />
        </ProfileCard>
      </div>
    </SectionPage>
  )
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)

const QuickLinkCard: React.FC<{
  to: string
  icon: React.ReactNode
  title: string
  description: string
}> = ({ to, icon, title, description }) => (
  <Link
    to={to}
    className="rounded-[24px] border border-gray-200 bg-gray-50 p-4 transition hover:border-amber-300 hover:bg-amber-50/60 dark:border-gray-800 dark:bg-gray-700 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10"
  >
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
      {icon}
      {title}
    </div>
    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
      {description}
    </p>
  </Link>
)
