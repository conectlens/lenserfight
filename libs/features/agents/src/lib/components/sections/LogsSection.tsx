import { queryKeys } from '@lenserfight/data/cache'
import { Card, Button } from '@lenserfight/ui/components'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentRunEventRecord, AgentTeamRunRecord, FleetLogRow } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

// ─── Per-run event accordion (agent_owner mode) ───────────────────────────────

const RunEventsAccordion: React.FC<{
  run: AgentTeamRunRecord
  aiLenserId: string
  eventTypeFilter: string
  payloadSearch?: string
}> = ({ run, aiLenserId, eventTypeFilter, payloadSearch }) => {
  const [expanded, setExpanded] = useState(false)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const events = useQuery<AgentRunEventRecord[]>({
    queryKey: queryKeys.agents.runEvents(aiLenserId, run.id, eventTypeFilter),
    queryFn: () =>
      agentWorkspaceService.listAgentRunEvents(aiLenserId, {
        runId: run.id,
        eventType: eventTypeFilter || undefined,
        limit: 200,
      }),
    enabled: expanded,
    staleTime: 30_000,
  })

  const visibleEvents = (events.data ?? []).filter((ev) => {
    if (!payloadSearch) return true
    return JSON.stringify(ev.payload).toLowerCase().includes(payloadSearch.toLowerCase())
  })

  return (
    <Card className="!p-0">
      <Button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown size={15} className="text-primary-yellow-600 dark:text-primary-yellow-400" />
          ) : (
            <ChevronRight size={15} className="text-gray-400" />
          )}
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
            Run {run.id.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold dark:border-gray-700">
            {run.status}
          </span>
          <span>{formatDateTime(run.started_at)}</span>
        </div>
      </Button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-3 pt-2 dark:border-gray-800">
          {events.isLoading ? (
            <p className="py-4 text-center text-xs text-gray-500">Loading events…</p>
          ) : visibleEvents.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">
              {payloadSearch ? 'No events match the payload filter.' : 'No events yet for this run.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {visibleEvents.map((ev) => {
                const hasPayload = Object.keys(ev.payload ?? {}).length > 0
                const isExpanded = expandedEventId === ev.id
                return (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
                  >
                    <Button
                      type="button"
                      disabled={!hasPayload}
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : ev.id)
                      }
                      className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-xs disabled:cursor-default"
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${hasPayload ? 'text-gray-400' : 'text-transparent'} ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                      />
                      <span className="font-mono text-gray-400 dark:text-gray-500">
                        {formatDateTime(ev.occurred_at)}
                      </span>
                      <span className="rounded-full border border-primary-yellow-200 px-2 py-0.5 font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                        {ev.event_type}
                      </span>
                      {ev.agent_run_step_id && (
                        <span className="font-mono text-gray-400 dark:text-gray-500">
                          step {ev.agent_run_step_id.slice(0, 8)}
                        </span>
                      )}
                    </Button>
                    {isExpanded && hasPayload && (
                      <pre className="overflow-auto border-t border-gray-100 px-3 pb-3 pt-2 font-mono text-xs leading-5 text-primary-yellow-100 dark:border-gray-800 bg-gray-950 rounded-b-xl">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    )}
                    {isExpanded && !hasPayload && (
                      <p className="border-t border-gray-100 px-3 pb-2 pt-1 text-xs text-gray-400 dark:border-gray-800">
                        No payload data.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export const LogsSection: React.FC = () => {
  const { viewMode, profile, bootstrap } = useAgentWorkspace()
  const [eventFilter, setEventFilter] = useState('')
  const [payloadSearch, setPayloadSearch] = useState('')

  if (viewMode === 'human_owner') {
    return (
      <HumanFleetLogs
        humanLenserId={profile.id}
        eventFilter={eventFilter}
        onChange={setEventFilter}
      />
    )
  }

  const aiLenserId = bootstrap?.ai_lenser_id ?? ''
  const runs = bootstrap?.runs ?? []

  return (
    <SectionPage
      eyebrow="Logs"
      docsPath="/how-to/agents/workspace/logs"
      docsTip="Append-only event stream: lifecycle transitions, tool invocations, policy denials, gateway pings. Filterable by event_type and time window."
      title="Run event stream"
      description="Click a run to expand its events. Click an event to inspect its payload. Filter by event_type or search within payloads."
      toolbar={
        <div className="flex gap-2">
          <input
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            placeholder="event_type filter"
            className="w-44 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <input
            value={payloadSearch}
            onChange={(e) => setPayloadSearch(e.target.value)}
            placeholder="payload search"
            className="w-44 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
      }
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
            <RunEventsAccordion
              key={run.id}
              run={run}
              aiLenserId={aiLenserId}
              eventTypeFilter={eventFilter}
              payloadSearch={payloadSearch}
            />
          ))}
        </div>
      )}
    </SectionPage>
  )
}

// ─── Human fleet log (human_owner mode) ──────────────────────────────────────

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
      docsPath="/how-to/agents/workspace/logs"
      docsTip="Cross-agent event log. Useful for spotting tool-call failures, approval waits, and step transitions across the entire fleet."
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
            <Card
              key={row.event_id}
              className="!px-4 !py-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  {formatDateTime(row.occurred_at)}
                </span>
                <span className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  @{row.agent_handle}
                </span>
                <span className="rounded-full border border-primary-yellow-200 px-2 py-0.5 font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                  {row.event_type}
                </span>
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  run {row.team_run_id.slice(0, 8)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionPage>
  )
}
