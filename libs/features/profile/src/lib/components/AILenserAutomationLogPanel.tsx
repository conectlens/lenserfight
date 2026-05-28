import { Badge, EmptyState } from '@lenserfight/ui/components'
import { Clock3 } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import type { AgentAutomationFeedItem, AgentAutomationFeedKind } from '@lenserfight/types'

const FILTERS: Array<{ id: 'all' | AgentAutomationFeedKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'schedule_dispatch', label: 'Schedules' },
  { id: 'workflow_run', label: 'Runs' },
  { id: 'workflow_event', label: 'Events' },
  { id: 'agent_action', label: 'Actions' },
]

const kindColor: Record<AgentAutomationFeedKind, 'yellow' | 'blue' | 'green' | 'gray'> = {
  schedule_dispatch: 'yellow',
  workflow_run: 'blue',
  workflow_event: 'green',
  agent_action: 'gray',
}

interface AILenserAutomationLogPanelProps {
  feed: AgentAutomationFeedItem[]
  isLoading?: boolean
}

export const AILenserAutomationLogPanel: React.FC<AILenserAutomationLogPanelProps> = ({
  feed,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<'all' | AgentAutomationFeedKind>('all')

  const items = useMemo(
    () => (filter === 'all' ? feed : feed.filter((item) => item.kind === filter)),
    [feed, filter]
  )

  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
  }

  if (feed.length === 0) {
    return <EmptyState icon={Clock3} title="No automation logs yet." />
  }

  const dispatched = feed.filter((i) => i.kind === 'schedule_dispatch' && i.result === 'success').length
  const failed = feed.filter((i) => i.result === 'failed').length
  const lastActivity = feed[0]?.occurred_at ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{feed.length}</span> events
        </span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-green-600 dark:text-green-400">{dispatched}</span> dispatched
        </span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-red-600 dark:text-red-400">{failed}</span> failed
        </span>
        {lastActivity && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-500 dark:text-gray-400">
              Last: {new Date(lastActivity).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === item.id
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.kind}:${item.id}`}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge color={kindColor[item.kind]}>{item.kind.replace(/_/g, ' ')}</Badge>
              {item.action_type && <Badge color="gray" variant="outline">{item.action_type}</Badge>}
              {item.result && <Badge color={item.result === 'failed' ? 'red' : 'green'}>{item.result}</Badge>}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.occurred_at).toLocaleString()}
              </span>
            </div>

            <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>

            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
              {item.workflow_title && <span>Workflow: {item.workflow_title}</span>}
              {item.run_id && <span>Run: {item.run_id}</span>}
              {item.schedule_id && <span>Schedule: {item.schedule_id}</span>}
              {item.event_type && <span>Event: {item.event_type}</span>}
            </div>

            {Object.keys(item.payload ?? {}).length > 0 && (
              <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-950 p-3 text-xs text-gray-100">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
