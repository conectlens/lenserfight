import { queryKeys } from '@lenserfight/data/cache'
import { Button, Card } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Search } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { RunDetailDrawer } from '../drawers/RunDetailDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type { AgentTeamRunRecord, FleetRunRow } from '@lenserfight/types'

const STATUSES = ['', 'queued', 'running', 'blocked', 'completed', 'failed', 'cancelled']

const STATUS_COLORS: Record<string, string> = {
  queued: 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400',
  running: 'border-primary-yellow-200 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300',
  blocked: 'border-orange-200 text-orange-700 dark:border-orange-500/30 dark:text-orange-300',
  completed: 'border-green-200 text-green-700 dark:border-green-500/30 dark:text-green-300',
  failed: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
  cancelled: 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500',
}

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.queued}`}
  >
    {status}
  </span>
)

export const RunsSection: React.FC = () => {
  const { viewMode, profile, bootstrap } = useAgentWorkspace()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [inspectRun, setInspectRun] = useState<AgentTeamRunRecord | null>(null)

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
    <>
      <SectionPage
        eyebrow="Runs"
        docsPath="/how-to/agents/workspace/runs"
        docsTip="Unified queue of every workflow execution (manual, scheduled, webhook). Click a row to open the Run Detail drawer with the full timeline, inputs, outputs, and tool calls."
        title="Team and workflow run history"
        description="Each manual run, CRON dispatch, or human-approved execution lands here. Filter by status to focus on blockers and failures."
        toolbar={
          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All statuses' },
              ...STATUSES.filter(Boolean).map((status) => ({ value: status, label: status })),
            ]}
            className="w-44"
          />
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
              <Card key={run.id} className="!p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {run.id.slice(0, 8)}…
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={run.status} />
                      {run.approval_status && run.approval_status !== 'not_required' && (
                        <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          {run.approval_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      {run.started_at ? formatDateTime(run.started_at) : 'Not started'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectRun(run)}
                    className="shrink-0"
                  >
                    <Search size={12} />
                    Inspect
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionPage>

      <RunDetailDrawer
        open={!!inspectRun}
        onClose={() => setInspectRun(null)}
        run={inspectRun}
        aiLenserId={bootstrap?.ai_lenser_id ?? ''}
        handle={profile.handle}
      />
    </>
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
  const [inspectFleetTarget, setInspectFleetTarget] = useState<{
    run: AgentTeamRunRecord
    aiLenserId: string
  } | null>(null)

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
    <>
      <SectionPage
        eyebrow="Runs"
        docsPath="/how-to/agents/workspace/runs"
        docsTip="Run history aggregated across every agent you own. Filter by agent or status to focus on blockers."
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
            <SelectField
              value={statusFilter}
              onChange={onStatusChange}
              options={[
                { value: '', label: 'All statuses' },
                ...STATUSES.filter(Boolean).map((status) => ({ value: status, label: status })),
              ]}
              className="w-44"
            />
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
          <Card className="overflow-x-auto !p-0">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Run</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
                {(runs.data ?? []).map((row) => (
                  <tr key={row.run_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="px-4 py-3 font-mono text-xs">@{row.agent_handle}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.run_id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {row.approval_status ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(row.started_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setInspectFleetTarget({
                            run: {
                              id: row.run_id,
                              ai_lenser_id: row.ai_lenser_id,
                              team_id: null,
                              workflow_id: null,
                              workflow_run_id: null,
                              workflow_assignment_id: null,
                              status: row.status as AgentTeamRunRecord['status'],
                              approval_status: (row.approval_status ?? 'not_required') as AgentTeamRunRecord['approval_status'],
                              scratchpad: {},
                              metadata: {},
                              started_at: row.started_at,
                              completed_at: null,
                              created_at: row.started_at ?? new Date().toISOString(),
                              updated_at: row.started_at ?? new Date().toISOString(),
                            },
                            aiLenserId: row.ai_lenser_id,
                          })
                        }
                      >
                        <Search size={11} />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </SectionPage>

      <RunDetailDrawer
        open={!!inspectFleetTarget}
        onClose={() => setInspectFleetTarget(null)}
        run={inspectFleetTarget?.run ?? null}
        aiLenserId={inspectFleetTarget?.aiLenserId ?? ''}
        handle=""
      />
    </>
  )
}
