import { useAuth } from '@lenserfight/features/auth'
import { Avatar, Badge, Button } from '@lenserfight/ui/components'
import { timeAgo } from '@lenserfight/utils/date'
import { FEATURES } from '@lenserfight/utils/env'
import { workflowsService, type AgentProfileView } from '@lenserfight/data/repositories'
import type { AgentAutomationFeedItem } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BarChart3,
  Bot,
  CalendarClock,
  Clock,
  ExternalLink,
  GitBranch,
  ScrollText,
  Settings,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAgentAutomationFeed } from '../hooks/useAgentAutomationFeed'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { AgentPolicySummary } from '../components/AgentPolicySummary'
import { AgentQuotaBar } from '../components/AgentQuotaBar'
import { AgentStatusBadge } from '../components/AgentStatusBadge'

type WorkspaceTab = 'overview' | 'logs' | 'workflows' | 'executions' | 'cron'

const TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Bot size={14} /> },
  { id: 'logs', label: 'Logs', icon: <ScrollText size={14} /> },
  { id: 'workflows', label: 'Workflows', icon: <GitBranch size={14} /> },
  { id: 'executions', label: 'Execution History', icon: <Zap size={14} /> },
  ...(FEATURES.CRON_SCHEDULING ? [{ id: 'cron' as const, label: 'CRON', icon: <CalendarClock size={14} /> }] : []),
]

export function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')

  const { data: agent, isLoading } = useAgentDetail(agentId)
  const { data: feed = [], isLoading: feedLoading } = useAgentAutomationFeed(agentId, 200)

  // user.id == auth.uid() == lenser profile ID for the current session's active lenser
  const isOwner = !!user && !!agent && user.id === agent.owner_lenser_id

  // Workflows owned by this agent
  const { data: agentWorkflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', 'byLenser', agent?.profile_id],
    queryFn: () => workflowsService.listByLenser(agent!.profile_id),
    enabled: !!agent?.profile_id,
    staleTime: 1000 * 60,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Loading agent…
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-gray-400">
        Agent not found.
        <Button variant="secondary" onClick={() => navigate(-1)} className="w-auto">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl !p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </Button>

        <Avatar src={agent.avatar_url} alt={agent.display_name} size="md" className="!w-10 !h-10" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {agent.display_name}
            </h1>
            <AgentStatusBadge isActive={agent.is_active} suspendedAt={agent.suspended_at} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{agent.handle}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isOwner && (
            <Link
              to={`/lenser/${agent.owner_handle}?modal=agent&agentId=${agent.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings size={13} /> Manage
            </Link>
          )}
          <Link
            to={`/lenser/${agent.handle}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ExternalLink size={13} /> Profile
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && agent && (
        <OverviewTab agent={agent} isOwner={isOwner} />
      )}
      {activeTab === 'logs' && (
        <LogsTab feed={feed.filter((f) => f.kind === 'agent_action')} isLoading={feedLoading} />
      )}
      {activeTab === 'workflows' && (
        <WorkflowsTab workflows={agentWorkflows} isLoading={workflowsLoading} />
      )}
      {activeTab === 'executions' && (
        <ExecutionsTab
          feed={feed.filter((f) => f.kind === 'workflow_run' || f.kind === 'schedule_dispatch')}
          isLoading={feedLoading}
        />
      )}
      {FEATURES.CRON_SCHEDULING && activeTab === 'cron' && (
        <CronTab workflows={agentWorkflows} agentId={agent.id} isOwner={isOwner} />
      )}
    </div>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ agent, isOwner: _isOwner }: { agent: AgentProfileView; isOwner: boolean }) {
  if (!agent) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Identity */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Identity
        </h2>
        <div className="space-y-2 text-sm">
          <InfoRow label="Handle" value={`@${agent.handle}`} />
          <InfoRow label="Runtime" value={agent.runtime_pref} />
          <InfoRow label="Models" value={String(agent.model_count)} />
          <InfoRow label="Lenses" value={String(agent.lens_count)} />
          {agent.personality_note && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Personality Note</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                {agent.personality_note}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Policy & Quota */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Policy & Quota
        </h2>
        <AgentPolicySummary
          canJoinBattles={agent.can_join_battles}
          canVote={agent.can_vote}
          canCreateBattles={agent.can_create_battles}
          modelBindingMode={agent.model_binding_mode}
        />
        <div className="mt-4">
          <AgentQuotaBar
            battlesUsed={agent.battles_used}
            maxDailyBattles={agent.max_daily_battles}
            votesUsed={agent.votes_used}
            maxDailyVotes={agent.max_daily_votes}
          />
        </div>
      </div>

      {/* Owner */}
      {agent.owner_lenser_id && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Owner
          </h2>
          <Link
            to={`/lenser/${agent.owner_handle}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar src={agent.owner_avatar_url} alt={agent.owner_display_name} size="sm" className="!w-8 !h-8" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.owner_display_name}</p>
              <p className="text-xs text-gray-400">@{agent.owner_handle}</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  )
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

function LogsTab({ feed, isLoading }: { feed: AgentAutomationFeedItem[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState label="Loading logs…" />

  if (feed.length === 0) {
    return (
      <EmptyState icon={<ScrollText size={28} />} label="No action logs yet." />
    )
  }

  return (
    <div className="space-y-2">
      {feed.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3"
        >
          <div className="mt-0.5">
            <Zap size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
            {'action_type' in item && item.action_type && (
              <Badge color="gray" variant="outline" className="text-[10px] mt-0.5">
                {item.action_type}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {timeAgo(item.occurred_at)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Workflows ────────────────────────────────────────────────────────────────

function WorkflowsTab({ workflows, isLoading }: { workflows: { id: string; title: string; description?: string | null; visibility: string }[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState label="Loading workflows…" />

  if (workflows.length === 0) {
    return <EmptyState icon={<GitBranch size={28} />} label="No workflows for this agent yet." />
  }

  return (
    <div className="space-y-2">
      {workflows.map((wf) => (
        <Link
          key={wf.id}
          to={`/workflows/${wf.id}`}
          className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <GitBranch size={16} className="text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{wf.title}</p>
            {wf.description && (
              <p className="text-xs text-gray-400 truncate">{wf.description}</p>
            )}
          </div>
          <Badge color={wf.visibility === 'public' ? 'green' : 'gray'} variant="outline" className="text-[10px] flex-shrink-0">
            {wf.visibility}
          </Badge>
          <ExternalLink size={13} className="text-gray-300 flex-shrink-0" />
        </Link>
      ))}
    </div>
  )
}

// ─── Executions ───────────────────────────────────────────────────────────────

function ExecutionsTab({ feed, isLoading }: { feed: AgentAutomationFeedItem[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState label="Loading execution history…" />

  if (feed.length === 0) {
    return <EmptyState icon={<BarChart3 size={28} />} label="No workflow executions recorded yet." />
  }

  return (
    <div className="space-y-2">
      {feed.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3"
        >
          <div className="mt-0.5 flex-shrink-0">
            {item.kind === 'schedule_dispatch' ? (
              <CalendarClock size={14} className="text-blue-500" />
            ) : (
              <Zap size={14} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
            {'workflow_title' in item && item.workflow_title && (
              <p className="text-xs text-gray-400 truncate">{item.workflow_title}</p>
            )}
            {'run_id' in item && item.run_id && (
              <Link
                to={`/workflows/${'workflow_id' in item ? item.workflow_id : ''}?runId=${item.run_id}`}
                className="text-[10px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View run
              </Link>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {timeAgo(item.occurred_at)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── CRON ─────────────────────────────────────────────────────────────────────

function CronTab({ workflows, agentId: _agentId, isOwner }: { workflows: { id: string; title: string }[]; agentId: string; isOwner: boolean }) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    workflows[0]?.id ?? null
  )

  if (workflows.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock size={28} />}
        label="No workflows to schedule. Create a workflow for this agent first."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Workflow selector */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Workflows
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => setSelectedWorkflowId(wf.id)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                selectedWorkflowId === wf.id
                  ? 'bg-primary/5 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <GitBranch size={12} className="flex-shrink-0 text-gray-400" />
                <span className="truncate">{wf.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cron panel for selected workflow */}
      <div className="md:col-span-2 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {selectedWorkflowId ? (
          <CronTabWorkflowSchedules workflowId={selectedWorkflowId} isOwner={isOwner} />
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            Select a workflow to manage its schedules.
          </div>
        )}
      </div>
    </div>
  )
}

function CronTabWorkflowSchedules({ workflowId, isOwner }: { workflowId: string; isOwner: boolean }) {
  // Lazy import to avoid circular deps with workflows feature
  const { WorkflowCronPanel } = React.useMemo(
    () => ({
      WorkflowCronPanel: React.lazy(() =>
        import('@lenserfight/features/workflows').then((m) => ({ default: m.WorkflowCronPanel }))
      ),
    }),
    []
  )

  return (
    <React.Suspense fallback={<div className="p-4 text-sm text-gray-400">Loading…</div>}>
      <WorkflowCronPanel workflowId={workflowId} isOwner={isOwner} />
    </React.Suspense>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-gray-400">
      <Clock size={16} className="mr-2 animate-spin" />
      {label}
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-gray-400">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{label}</p>
    </div>
  )
}
