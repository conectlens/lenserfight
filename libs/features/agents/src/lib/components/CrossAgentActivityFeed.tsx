import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { CrossAgentFeedItem, CrossAgentFeedKind } from '@lenserfight/types'
import { Alert, Card } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import { Activity, Bot, CalendarClock, ShieldCheck } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { EmptyPanel } from './EmptyPanel'

interface CrossAgentActivityFeedProps {
  humanLenserId: string
  limit?: number
}

const KIND_META: Record<
  CrossAgentFeedKind,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  approval_pending: {
    label: 'Approval pending',
    icon: <ShieldCheck size={16} />,
    tone: 'border-primary-yellow-200 bg-primary-yellow-50 text-primary-yellow-800 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-200',
  },
  team_run: {
    label: 'Team run',
    icon: <Activity size={16} />,
    tone: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  },
  schedule_dispatch: {
    label: 'Schedule',
    icon: <CalendarClock size={16} />,
    tone: 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
  },
  agent_action: {
    label: 'Agent action',
    icon: <Bot size={16} />,
    tone: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
  },
}

function destinationFor(item: CrossAgentFeedItem): string {
  switch (item.kind) {
    case 'approval_pending':
      return `/lenser/${item.ai_lenser_handle}/ag/approvals`
    case 'team_run':
      return `/lenser/${item.ai_lenser_handle}/ag/runs`
    case 'schedule_dispatch':
      return `/lenser/${item.ai_lenser_handle}/ag/schedules`
    case 'agent_action':
      return `/lenser/${item.ai_lenser_handle}/ag/logs`
  }
}

/**
 * Cross-agent activity feed. Backed by `fn_get_human_activity_feed`. Used in
 * the Activity tab of `/lenser/:human-handle/ag/overview` to surface a unified
 * sorted view across every owned AI lenser.
 */
export const CrossAgentActivityFeed: React.FC<CrossAgentActivityFeedProps> = ({
  humanLenserId,
  limit = 50,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.humanActivityFeed(humanLenserId, limit, 0),
    queryFn: () => agentWorkspaceService.getHumanActivityFeed(humanLenserId, limit, 0),
    enabled: !!humanLenserId,
    staleTime: 15_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error" title="Activity feed failed to load">
        {(error as Error).message}
      </Alert>
    )
  }

  const items = data ?? []

  if (items.length === 0) {
    return (
      <EmptyPanel
        icon={<Activity size={22} />}
        title="No activity yet"
        description="Pending approvals, recent team runs, scheduled dispatches, and agent actions across every agent you own will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const meta = KIND_META[item.kind]
        return (
          <Link
            key={`${item.kind}-${item.team_run_id ?? item.schedule_id ?? item.occurred_at}-${item.ai_lenser_id}`}
            to={destinationFor(item)}
            className="block"
          >
          <Card className="transition hover:border-primary-yellow-300 hover:shadow-md dark:hover:border-primary-yellow-500/40">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.tone}`}
                  >
                    {meta.icon}
                    {meta.label}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    @{item.ai_lenser_handle}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {item.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.occurred_at).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          </Link>
        )
      })}
    </div>
  )
}
