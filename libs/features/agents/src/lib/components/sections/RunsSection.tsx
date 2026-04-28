import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type { FleetRunRow } from '@lenserfight/types'

const STATUSES = ['', 'queued', 'running', 'blocked', 'completed', 'failed', 'cancelled']

export const RunsSection: React.FC = () => {
  const { viewMode, profile, bootstrap } = useAgentWorkspace()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [agentFilter, setAgentFilter] = useState<string>('')

  if (viewMode === 'human_owner') {
    return (
      <HumanFleetRuns
        humanLenserId={profile.id}
        statusFilter={statusFilter}
        agentFilter={agentFilter}
        onStatusChange={setStatusFilter}
        onAgentChange={setAgentFilter}
      />
    )
  }

  const runs = bootstrap?.runs ?? []
  const filtered =
    statusFilter === ''
      ? runs
      : runs.filter((r) => r.status === statusFilter)

  return (
    <SectionPage
      eyebrow="Runs"
      title="Team and workflow run history"
      description="Each manual run, CRON dispatch, or human-approved execution lands here. Filter by status to focus on blockers and failures."
      toolbar={
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      }
    >
      {filtered.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No runs match"
          description={statusFilter ? `No ${statusFilter} runs in the current bootstrap.` : 'Scheduled or manual control-room runs will appear here once execution begins.'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((run) => (
            <div key={run.id} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Run {run.id.slice(0, 8)}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Status: <span className="font-semibold text-gray-900 dark:text-white">{run.status}</span> · Approval: <span className="font-semibold text-gray-900 dark:text-white">{run.approval_status ?? 'n/a'}</span>
              </p>
              <pre className="mt-4 max-h-48 overflow-auto rounded-2xl bg-gray-950 p-4 text-xs leading-6 text-amber-100">
                {JSON.stringify(run, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  )
}

const HumanFleetRuns: React.FC<{
  humanLenserId: string
  statusFilter: string
  agentFilter: string
  onStatusChange: (s: string) => void
  onAgentChange: (s: string) => void
}> = ({ humanLenserId, statusFilter, agentFilter, onStatusChange, onAgentChange }) => {
  const filters = { status: statusFilter || undefined, agentId: agentFilter || undefined }
  const runs = useQuery<FleetRunRow[]>({
    queryKey: queryKeys.agents.fleetRuns(humanLenserId, filters as Record<string, unknown>),
    queryFn: () =>
      agentWorkspaceService.listFleetRuns(humanLenserId, {
        status: statusFilter || undefined,
        agentId: agentFilter || undefined,
        limit: 100,
      }),
    staleTime: 15_000,
  })

  return (
    <SectionPage
      eyebrow="Runs"
      title="Fleet run history"
      description="Run history aggregated across every agent you own. Filter by agent or status."
      toolbar={
        <div className="flex gap-2">
          <input
            value={agentFilter}
            onChange={(e) => onAgentChange(e.target.value)}
            placeholder="agent id (uuid)"
            className="w-44 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      }
    >
      {runs.isLoading ? (
        <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
      ) : (runs.data ?? []).length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No runs match"
          description="Try clearing filters or run a workflow on one of your agents."
        />
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approval</th>
                <th className="px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
              {(runs.data ?? []).map((row) => (
                <tr key={row.run_id}>
                  <td className="px-4 py-3 font-mono text-xs">@{row.agent_handle}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.run_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{row.approval_status ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(row.started_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionPage>
  )
}
