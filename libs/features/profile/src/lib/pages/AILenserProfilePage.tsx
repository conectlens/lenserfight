import React from 'react'

import { queryKeys } from '@lenserfight/data/cache'
import {
  agentsService,
  reactionService,
  threadsService,
  workflowsService,
  type WorkflowRecord,
  type WorkflowScheduleRecord,
} from '@lenserfight/data/repositories'
import {
  AgentPolicySummary,
  AgentStatusBadge,
  useRunUnified,
} from '@lenserfight/features/agents'
import { ThreadsListCard } from '@lenserfight/features/home'
import { EmptyState } from '@lenserfight/ui/components'
import { Dialog } from '@lenserfight/ui/overlays'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Bot,
  CalendarClock,
  GitBranch,
  Info,
  MessageSquare,
  Network,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AILenserWorkflowPanel } from '../components/AILenserWorkflowPanel'
import { LenserActionsList } from '../components/LenserActionsList'
import { LenserProfileHeader } from '../components/LenserProfileHeader'
import { LenserTabContent, LenserTabs, type LenserTabDefinition, type LenserTabId } from '../components/LenserTabs'
import { useWorkspaceSwitchController } from '../useWorkspaceSwitchController'

const AgentManageWizard = React.lazy(() =>
  import('@lenserfight/features/agents').then((m) => ({ default: m.AgentManageWizard }))
)

import type {
  ActivityFeedItem,
  Lenser,
  LenserProfileDTO,
  LenserStats,
  RelationshipState,
  RunUnifiedRow,
  ThreadFeedItem,
  XPSummary,
} from '@lenserfight/types'

// ── Types ────────────────────────────────────────────────────────────────────

type AgentProfileView = NonNullable<
  Awaited<ReturnType<typeof agentsService.getAgentProfileByProfileId>>
>

// ── Tab config ───────────────────────────────────────────────────────────────

const AI_TAB_MAP: Record<string, LenserTabId> = {
  ath: 'ai_threads',
  ab: 'ai_about',
  aw: 'ai_workflows',
  aac: 'ai_actions',
  // Legacy mappings for backward compatibility
  ao: 'ai_about',
  at: 'ai_about',
  ar: 'ai_actions',
  act: 'ai_actions',
  acr: 'ai_workflows',
}

const AI_REVERSE_TAB_MAP: Partial<Record<LenserTabId, string>> = {
  ai_threads: 'ath',
  ai_about: 'ab',
  ai_workflows: 'aw',
  ai_actions: 'aac',
}

const AI_TABS: LenserTabDefinition[] = [
  { id: 'ai_threads', label: 'Threads' },
  { id: 'ai_about', label: 'About' },
  { id: 'ai_workflows', label: 'Workflows' },
  { id: 'ai_actions', label: 'Activity' },
]

// ── Main component ───────────────────────────────────────────────────────────

interface AILenserProfilePageProps {
  viewedProfile: LenserProfileDTO
  isOwner: boolean
  stats: LenserStats | null
  xpSummary: XPSummary | null
  relationshipState: RelationshipState | null
  routeTab: string | undefined
  handle: string
  onProfileUpdate: (updated: Lenser) => void
}

export const AILenserProfilePage: React.FC<AILenserProfilePageProps> = ({
  viewedProfile,
  isOwner,
  stats,
  xpSummary,
  relationshipState,
  routeTab,
  handle,
  onProfileUpdate,
}) => {
  const navigate = useNavigate()
  const { switchToProfile } = useWorkspaceSwitchController()
  const [showAgentWizard, setShowAgentWizard] = React.useState(false)

  const activeTab: LenserTabId =
    (routeTab && AI_TAB_MAP[routeTab]) || 'ai_threads'

  const handleTabChange = (tab: LenserTabId) => {
    if (tab === activeTab) return
    const shortcode = AI_REVERSE_TAB_MAP[tab]
    if (!shortcode) return
    navigate(`/lenser/${handle}/${shortcode}`, { preventScrollReset: true })
  }

  const { data: agentProfile = null, isLoading: agentLoading } = useQuery({
    queryKey: queryKeys.agents.detailByProfile(viewedProfile.id),
    queryFn: () => agentsService.getAgentProfileByProfileId(viewedProfile.id),
    enabled: !!viewedProfile.id,
    staleTime: 60_000,
  })

  const { data: workflows = [] } = useQuery({
    queryKey: queryKeys.workflows.byLenser(viewedProfile.id),
    queryFn: () => workflowsService.listByLenser(viewedProfile.id),
    enabled: activeTab === 'ai_workflows',
    staleTime: 60_000,
  })

  const { data: schedules = [] } = useQuery({
    queryKey: queryKeys.workflows.schedules(),
    queryFn: () => workflowsService.getSchedules(),
    enabled: activeTab === 'ai_workflows' && workflows.length > 0,
    staleTime: 60_000,
  })

  const { data: runs = [], isLoading: runsLoading } = useRunUnified(
    agentProfile?.id ?? '',
    { limit: 20 }
  )

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['lenser', 'ai-profile-threads', handle],
    queryFn: () => threadsService.getThreadsByLenser(handle, undefined, 0, 20),
    enabled: activeTab === 'ai_threads',
    staleTime: 60_000,
  })

  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['lenser', 'ai-profile-actions', handle],
    queryFn: () => reactionService.getLenserActivityFeed(handle, 0, 20),
    enabled: activeTab === 'ai_actions',
    staleTime: 60_000,
  })

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <LenserProfileHeader
        lenser={viewedProfile}
        stats={stats}
        xpSummary={xpSummary}
        isOwner={isOwner}
        onProfileUpdate={onProfileUpdate}
        relationshipState={relationshipState}
        onEditAgent={() => setShowAgentWizard(true)}
        onControlRoom={() => switchToProfile(viewedProfile)}
        agentLenserId={agentProfile?.id}
      />


      <div className="mt-8 px-4 md:px-0">

        <LenserTabs activeTab={activeTab} onChange={handleTabChange} tabs={AI_TABS} />


        <LenserTabContent activeTab={activeTab}>
        <div className="min-h-[300px]">
          {activeTab === 'ai_threads' && (
            <ThreadsTab
              threads={threads as ThreadFeedItem[]}
              loading={threadsLoading}
              onOpen={(id) => navigate(`/threads/${id}`)}
            />
          )}

          {activeTab === 'ai_about' && (
            <div className="space-y-8">
              <OverviewTab agentProfile={agentProfile} loading={agentLoading} />
              <AboutTab profile={viewedProfile} agentProfile={agentProfile} />
              <TeamTab isOwner={isOwner} handle={handle} />
            </div>
          )}

          {activeTab === 'ai_workflows' && (
            <div className="space-y-12">
              <AILenserWorkflowPanel
                workflows={workflows}
                schedules={schedules}
                onOpenWorkflow={(id) => navigate(`/workflows/${id}`)}
              />
              {(isOwner || schedules.length > 0) && (
                <div className="border-t border-gray-100 pt-8 dark:border-gray-800">
                  <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CalendarClock className="text-primary" size={20} />
                    Active Schedules
                  </h3>
                  <CronTab
                    schedules={schedules}
                    workflows={workflows}
                    isOwner={isOwner}
                    handle={handle}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai_actions' && (
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="text-primary" size={20} />
                  System Runs
                </h3>
                <RunsTab
                  runs={runs}
                  loading={agentLoading || runsLoading}
                  isOwner={isOwner}
                  handle={handle}
                />
              </div>
              <div>
                <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="text-primary" size={20} />
                  Recent Reactions
                </h3>
                <ActionsTab
                  actions={actions as ActivityFeedItem[]}
                  loading={actionsLoading}
                />
              </div>

            </div>
          )}

        </div>
        </LenserTabContent>
      </div>

      {agentProfile && (
        <Dialog
          open={showAgentWizard}
          onClose={() => setShowAgentWizard(false)}
          title={`Edit ${viewedProfile.display_name}`}
          maxWidth="max-w-2xl"
        >
          <React.Suspense fallback={null}>
            <AgentManageWizard
              agentId={agentProfile.id}
              handle={handle}
              onDone={() => setShowAgentWizard(false)}
            />
          </React.Suspense>
        </Dialog>
      )}
    </div>
  )
}

// ── Sub-tab components ───────────────────────────────────────────────────────

function OverviewTab({
  agentProfile,
  loading,
}: {
  agentProfile: AgentProfileView | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (!agentProfile) {
    return <EmptyState icon={Bot} title="Agent details not available." />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
          <AgentStatusBadge
            isActive={agentProfile.is_active}
            suspendedAt={agentProfile.suspended_at}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Capabilities</p>
          <AgentPolicySummary
            canJoinBattles={agentProfile.can_join_battles}
            canVote={agentProfile.can_vote}
            canCreateBattles={agentProfile.can_create_battles}
            modelBindingMode={agentProfile.model_binding_mode}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Daily Battles</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {agentProfile.battles_used} / {agentProfile.max_daily_battles}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{
                width: `${Math.min(100, (agentProfile.battles_used / Math.max(1, agentProfile.max_daily_battles)) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Daily Votes</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {agentProfile.votes_used} / {agentProfile.max_daily_votes}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{
                width: `${Math.min(100, (agentProfile.votes_used / Math.max(1, agentProfile.max_daily_votes)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span>
            Runtime:{' '}
            <span className="font-medium capitalize text-gray-900 dark:text-white">
              {agentProfile.runtime_pref}
            </span>
          </span>
          <span>
            Model binding:{' '}
            <span className="font-medium capitalize text-gray-900 dark:text-white">
              {agentProfile.model_binding_mode}
            </span>
          </span>
          <span>
            Lenses:{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {agentProfile.lens_count}
            </span>
          </span>
          <span>
            Models:{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {agentProfile.model_count}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

function RunsTab({
  runs,
  loading,
  isOwner,
  handle,
}: {
  runs: RunUnifiedRow[]
  loading: boolean
  isOwner: boolean
  handle: string
}) {
  const navigate = useNavigate()

  const statusColor: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (runs.length === 0) {
    return <EmptyState icon={Activity} title="No runs recorded yet." />
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div
          key={run.run_id}
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor[run.status] ?? 'bg-gray-100 text-gray-500'
                }`}
            >
              {run.status}
            </span>
            <span className="text-sm capitalize text-gray-600 dark:text-gray-300">
              {run.run_type}
            </span>
            {run.step_count > 0 && (
              <span className="text-xs text-gray-400">{run.step_count} steps</span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {run.started_at ? new Date(run.started_at).toLocaleDateString() : '—'}
          </span>
        </div>
      ))}

      {isOwner && (
        <button
          type="button"
          onClick={() => navigate(`/lenser/${handle}/ag/runs`)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          View all runs in workspace →
        </button>
      )}
    </div>
  )
}

function AboutTab({
  profile,
  agentProfile,
}: {
  profile: LenserProfileDTO
  agentProfile: AgentProfileView | null
}) {
  const hasBio = !!(profile.bio || profile.headline)
  const hasPersonality = !!agentProfile?.personality_note

  return (
    <div className="space-y-5">
      {hasBio && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          {profile.headline && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {profile.headline}
            </p>
          )}
          {profile.bio && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{profile.bio}</p>
          )}
        </div>
      )}

      {hasPersonality && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Personality</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {agentProfile!.personality_note}
          </p>
        </div>
      )}

      {!hasBio && !hasPersonality && (
        <EmptyState icon={Info} title="No description provided." />
      )}
    </div>
  )
}

function TeamTab({ isOwner, handle }: { isOwner: boolean; handle: string }) {
  const navigate = useNavigate()

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <Network size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent team details</p>
      {isOwner ? (
        <button
          type="button"
          onClick={() => navigate(`/lenser/${handle}/ag/team`)}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Manage teams in workspace →
        </button>
      ) : (
        <p className="mt-1 text-xs text-gray-400">
          Team composition is visible in the agent workspace.
        </p>
      )}
    </div>
  )
}

function ThreadsTab({
  threads,
  loading,
  onOpen,
}: {
  threads: ThreadFeedItem[]
  loading: boolean
  onOpen: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (threads.length === 0) {
    return <EmptyState icon={MessageSquare} title="No threads posted yet." />
  }

  return (
    <div className="space-y-6">
      {threads.map((thread) => (
        <ThreadsListCard key={thread.id} thread={thread} onOpen={onOpen} isOwner={false} />
      ))}
    </div>
  )
}

function ActionsTab({
  actions,
  loading,
}: {
  actions: ActivityFeedItem[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (actions.length === 0) {
    return <EmptyState icon={Activity} title="No recent activity." />
  }

  return <LenserActionsList actions={actions} />
}

function CronTab({
  schedules,
  workflows,
  isOwner,
  handle,
}: {
  schedules: WorkflowScheduleRecord[]
  workflows: WorkflowRecord[]
  isOwner: boolean
  handle: string
}) {
  const navigate = useNavigate()

  const workflowTitleById = workflows.reduce<Record<string, string>>((acc, w) => {
    acc[w.id] = w.title
    return acc
  }, {})

  if (schedules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <CalendarClock size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No CRON schedules configured.</p>
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate(`/lenser/${handle}/ag/schedules`)}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Manage schedules in workspace →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {workflowTitleById[schedule.workflow_id] ??
                schedule.workflow_title ??
                'Unnamed workflow'}
            </p>
            <div className="flex items-center gap-3">
              <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-700">
                {schedule.cron_expr}
              </code>
              <span
                className={`text-xs font-medium ${schedule.is_active
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400'
                  }`}
              >
                {schedule.is_active ? '● Active' : '○ Paused'}
              </span>
            </div>
          </div>
          <GitBranch size={16} className="text-gray-400" />
        </div>
      ))}

      {isOwner && (
        <button
          type="button"
          onClick={() => navigate(`/lenser/${handle}/ag/schedules`)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          Manage schedules in workspace →
        </button>
      )}
    </div>
  )
}
