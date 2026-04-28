import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type { FleetLogRow } from '@lenserfight/types'

export const LogsSection: React.FC = () => {
  const { viewMode, profile, bootstrap } = useAgentWorkspace()
  const [eventFilter, setEventFilter] = useState('')

  if (viewMode === 'human_owner') {
    return <HumanFleetLogs humanLenserId={profile.id} eventFilter={eventFilter} onChange={setEventFilter} />
  }

  const runs = bootstrap?.runs ?? []

  return (
    <SectionPage
      eyebrow="Logs"
      title="Run event stream"
      description="Detailed event-level audit trail per run. Filter by event_type to focus on tool calls, approvals, or step transitions."
    >
      {runs.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No logs yet"
          description="Run events will populate here once executions start producing trace data."
        />
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="rounded-[20px] border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Run {run.id.slice(0, 8)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {run.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  )
}

const HumanFleetLogs: React.FC<{
  humanLenserId: string
  eventFilter: string
  onChange: (v: string) => void
}> = ({ humanLenserId, eventFilter, onChange }) => {
  const filters = { eventType: eventFilter || undefined }
  const logs = useQuery<FleetLogRow[]>({
    queryKey: queryKeys.agents.fleetLogs(humanLenserId, filters as Record<string, unknown>),
    queryFn: () =>
      agentWorkspaceService.listFleetLogs(humanLenserId, {
        eventType: eventFilter || undefined,
        limit: 200,
      }),
    staleTime: 10_000,
  })

  return (
    <SectionPage
      eyebrow="Logs"
      title="Fleet event log"
      description="Cross-agent event log. Useful for spotting tool-call failures, approval waits, and step transitions across the fleet."
      toolbar={
        <input
          value={eventFilter}
          onChange={(e) => onChange(e.target.value)}
          placeholder="event_type filter"
          className="w-48 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      }
    >
      {logs.isLoading ? (
        <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
      ) : (logs.data ?? []).length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No logs match"
          description="No events for this filter. Try clearing the filter or running a workflow."
        />
      ) : (
        <div className="space-y-2">
          {(logs.data ?? []).map((row) => (
            <div
              key={row.event_id}
              className="rounded-[16px] border border-gray-200 bg-white px-4 py-3 text-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  {formatDateTime(row.occurred_at)}
                </span>
                <span className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  @{row.agent_handle}
                </span>
                <span className="rounded-full border border-amber-200 px-2 py-0.5 font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                  {row.event_type}
                </span>
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  run {row.team_run_id.slice(0, 8)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  )
}
