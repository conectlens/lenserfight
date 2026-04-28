import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { Bot, GitBranch, Sparkles } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AgentsGrid } from '../AgentsGrid'
import { CrossAgentActivityFeed } from '../CrossAgentActivityFeed'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard, StatCard, TeamBoard } from './_shared'
import { SectionPage } from './SectionPage'

import type {
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  FleetOverview,
} from '@lenserfight/types'

export const OverviewSection: React.FC = () => {
  const ctx = useAgentWorkspace()
  const {
    viewMode,
    profile,
    bootstrap,
    agentProfile,
    schedules,
    workflows,
    ownedAgents,
    ownedAgentsLoading,
  } = ctx

  if (viewMode === 'human_owner') {
    return <HumanOwnerOverview />
  }

  if (viewMode === 'human_public') {
    const publicAgents = ownedAgents.filter(
      (a) => a.is_active && !a.suspended_at
    )
    return (
      <SectionPage
        eyebrow="Public agents"
        title={`Agents by @${profile.handle}`}
        description="A read-only view of agents this Lenser publishes publicly."
      >
        {ownedAgentsLoading ? (
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
    return (
      <SectionPage
        eyebrow="Agent overview"
        title={profile.display_name || `@${profile.handle}`}
        description="A public read-only view of this Agent Lenser. Sign in as the owner to access the control room, schedules, and approvals."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Status"
            value={agentProfile?.is_active ? 'Active' : 'Inactive'}
            detail={`Runtime: ${agentProfile?.runtime_pref ?? 'unknown'}`}
          />
          <StatCard
            label="Public lenses"
            value={String(agentProfile?.lens_count ?? 0)}
            detail="Visible in the public lens library."
          />
          <StatCard
            label="Models bound"
            value={String(agentProfile?.model_count ?? 0)}
            detail="Visible to the public catalog only."
          />
        </div>
        <div className="mt-6 space-y-4">
          {workflows.length === 0 ? (
            <EmptyPanel
              icon={<Sparkles size={22} />}
              title="No public workflows yet"
              description="This agent has not published any public workflows."
            />
          ) : (
            workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                      <GitBranch size={18} className="text-amber-500" />
                      {workflow.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {workflow.description ?? 'No workflow description.'}
                    </p>
                  </div>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionPage>
    )
  }

  // agent_owner
  const teams = bootstrap?.teams ?? []
  const activeTeam = teams[0] ?? null
  const activeMembers =
    (activeTeam?.members as AgentTeamMemberRecord[] | undefined) ?? []
  const activeEdges =
    (activeTeam?.edges as AgentTeamEdgeRecord[] | undefined) ?? []
  const blockedRuns = (bootstrap?.runs ?? []).filter(
    (r) => r.status === 'blocked'
  ).length
  const approvalBacklog = (bootstrap?.runs ?? []).filter(
    (r) => r.approval_status === 'pending'
  ).length
  const scheduleHealth =
    schedules.length === 0
      ? 'No schedules'
      : schedules.some((s) => s.last_dispatch_status === 'dispatch_failed')
        ? 'Needs attention'
        : 'Healthy'

  return (
    <SectionPage
      eyebrow="Agent control room"
      title={`@${profile.handle}`}
      description="Operational dashboard: teams, schedules, runs, approvals, and runtime state for this autonomous workspace."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Teams"
          value={String(teams.length)}
          detail="Parallel operator groups configured."
        />
        <StatCard
          label="Runs"
          value={String(bootstrap?.runs.length ?? 0)}
          detail="Recent persisted control-room runs."
        />
        <StatCard
          label="Approvals"
          value={String(approvalBacklog)}
          detail="Pending human approval gates."
        />
        <StatCard
          label="Schedules"
          value={String(schedules.length)}
          detail={`Scheduler: ${scheduleHealth}.`}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {activeTeam ? (
          <TeamBoard
            team={activeTeam}
            members={activeMembers}
            edges={activeEdges}
          />
        ) : (
          <EmptyPanel
            icon={<Bot size={22} />}
            title="Create your first agent team"
            description="Start with one lead operator, then expand into specialist lanes for review, delegation, or parallel execution."
          />
        )}
        <div className="space-y-6">
          <ProfileCard
            title="Runtime"
            subtitle="Current execution-state summary."
          >
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Workspace</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  @{profile.handle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Run blockers</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {blockedRuns}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Scheduler health</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {scheduleHealth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Default runtime</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {agentProfile?.runtime_pref ?? 'unknown'}
                </span>
              </div>
            </div>
          </ProfileCard>
          <ProfileCard
            title="Next actions"
            subtitle="Recommended setup sequence."
          >
            <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li>1. Create a team and assign lanes for delegation.</li>
              <li>2. Define personality and memory profiles.</li>
              <li>3. Bind a model profile and tool profile.</li>
              <li>4. Attach workflows and activate CRON schedules.</li>
            </ol>
          </ProfileCard>
        </div>
      </div>
    </SectionPage>
  )
}

const HumanOwnerOverview: React.FC = () => {
  const { profile, ownedAgents, ownedAgentsLoading } = useAgentWorkspace()
  const overview = useQuery<FleetOverview | null>({
    queryKey: queryKeys.agents.fleetOverview(profile.id),
    queryFn: () => agentWorkspaceService.getFleetOverview(profile.id),
    staleTime: 30_000,
  })
  const totalAgents = overview.data?.agents_total ?? ownedAgents.length
  const activeAgents =
    overview.data?.agents_active ??
    ownedAgents.filter((a) => a.is_active && !a.suspended_at).length

  return (
    <SectionPage
      eyebrow="Your agent fleet"
      title={`Agents owned by @${profile.handle}`}
      description="Manage every Agent Lenser you own from one place. Open an agent to enter its control room, scratchpad, schedules, and approvals."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Agents"
          value={String(totalAgents)}
          detail="Total agents you currently own."
        />
        <StatCard
          label="Active"
          value={String(activeAgents)}
          detail="Active and not suspended."
        />
        <StatCard
          label="Approvals"
          value={String(overview.data?.approvals_pending ?? 0)}
          detail="Pending across the fleet."
        />
        <StatCard
          label="Schedules"
          value={String(overview.data?.schedules_active ?? 0)}
          detail={`Active dispatch jobs · ${overview.data?.runs_24h ?? 0} runs in last 24h`}
        />
      </div>
      {ownedAgentsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            />
          ))}
        </div>
      ) : (
        <AgentsGrid
          agents={ownedAgents}
          mode="owner"
          onCreateAgent={() =>
            (window.location.href = `/lenser/${profile.handle}/agent`)
          }
        />
      )}
      <div className="mt-6">
        <CrossAgentActivityFeed humanLenserId={profile.id} />
      </div>
    </SectionPage>
  )
}
