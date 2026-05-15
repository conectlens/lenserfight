import type { RunIncidentRecord, RunReportRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, XCircle } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { useRunIncidents, useRunReports } from '../../hooks/useRunReports'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { EmptyPanel } from '../EmptyPanel'
import { RunDetailDrawer } from '../drawers/RunDetailDrawer'

import { formatDateTime, StatCard } from './_shared'
import { SectionPage } from './SectionPage'

import type { AgentTeamRunRecord } from '@lenserfight/types'

const OUTCOME_COLORS: Record<string, string> = {
  success:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300',
  partial:
    'border-primary-yellow-200 bg-primary-yellow-50 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-300',
  failed:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  cancelled:
    'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
  killed:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400',
  medium: 'border-primary-yellow-200 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300',
  high: 'border-orange-200 text-orange-700 dark:border-orange-500/30 dark:text-orange-300',
  critical: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
}

const OutcomePill: React.FC<{ outcome: string }> = ({ outcome }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${OUTCOME_COLORS[outcome] ?? OUTCOME_COLORS.failed}`}
  >
    {outcome}
  </span>
)

const IncidentRow: React.FC<{ incident: RunIncidentRecord }> = ({ incident }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-700">
    <AlertTriangle
      size={14}
      className={`mt-0.5 flex-shrink-0 ${incident.severity === 'critical' || incident.severity === 'high' ? 'text-red-500' : 'text-primary-yellow-500'}`}
    />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {incident.title}
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[incident.severity] ?? SEVERITY_COLORS.medium}`}
        >
          {incident.severity}
        </span>
        <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {incident.incident_type.replaceAll('_', ' ')}
        </span>
        {incident.resolved_at && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 size={10} />
            resolved
          </span>
        )}
      </div>
      {incident.description && (
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
          {incident.description}
        </p>
      )}
    </div>
  </div>
)

const ReportCard: React.FC<{
  report: RunReportRecord
  aiLenserId: string
  handle: string
  onInspectRun: (teamRunId: string) => void
}> = ({ report, aiLenserId: _aiLenserId, handle: _handle, onInspectRun }) => {
  const [expanded, setExpanded] = useState(false)
  const incidents = useRunIncidents(expanded ? report.id : null)
  const hasRun = !!report.team_run_id

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <OutcomePill outcome={report.outcome} />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {report.title}
            </span>
          </div>

          {report.summary && (
            <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {report.summary}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{report.total_steps} step{report.total_steps === 1 ? '' : 's'}</span>
            <span>{report.total_tool_invocations} tool invocation{report.total_tool_invocations === 1 ? '' : 's'}</span>
            <span>{report.total_memory_writes} memory write{report.total_memory_writes === 1 ? '' : 's'}</span>
            {report.total_cost_estimate > 0 && (
              <span>{report.total_cost_estimate.toFixed(4)} credits</span>
            )}
            {report.evaluation_score !== null && (
              <span>eval score: {report.evaluation_score.toFixed(2)}</span>
            )}
            <span>{formatDateTime(report.created_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {hasRun && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInspectRun(report.team_run_id!)}
            >
              <ClipboardList size={12} />
              Run trace
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <AlertTriangle size={12} />
            {expanded ? 'Hide incidents' : 'View incidents'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          {incidents.isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : !incidents.data || incidents.data.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 size={14} />
              No incidents recorded for this report.
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.data.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const ReportsSection: React.FC = () => {
  const { bootstrap, bootstrapState, profile } = useAgentWorkspace()
  const aiLenserId = bootstrap?.ai_lenser_id ?? ''
  const reports = useRunReports(aiLenserId, 30)

  const [inspectRun, setInspectRun] = useState<{ teamRunId: string } | null>(null)

  const syntheticRun = inspectRun
    ? ({ id: inspectRun.teamRunId } as unknown as AgentTeamRunRecord)
    : null

  const allReports = reports.data ?? []
  const successCount = allReports.filter((r) => r.outcome === 'success').length
  const failedCount = allReports.filter((r) => r.outcome === 'failed' || r.outcome === 'killed').length
  const totalCost = allReports.reduce((sum, r) => sum + (r.total_cost_estimate ?? 0), 0)

  return (
    <>
      <SectionPage
        eyebrow="Reports"
        docsPath="/how-to/agents/workspace/reports"
        docsTip="Durable outcome records emitted after each run completes. Exportable as CSV/JSON for arbitrary time windows."
        title="Execution reports"
        description="Durable outcome records generated after each run completes. Each report links to the team run trace and any incidents that occurred."
      >
        <BootstrapStatusPanel state={bootstrapState} />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Successful"
            value={String(successCount)}
            detail="Reports with a success outcome."
          />
          <StatCard
            label="Failed / killed"
            value={String(failedCount)}
            detail="Reports that ended in failure or were killed."
          />
          <StatCard
            label="Total cost"
            value={`${totalCost.toFixed(4)}`}
            detail="Sum of credit costs across all reports."
          />
        </div>

        {reports.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              />
            ))}
          </div>
        ) : allReports.length === 0 ? (
          <EmptyPanel
            icon={<BarChart3 size={20} />}
            title="No run reports yet"
            description="Reports are generated automatically after a team run completes. Dispatch a workflow assignment to create the first report."
          />
        ) : (
          <div className="space-y-4">
            {allReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                aiLenserId={aiLenserId}
                handle={profile.handle}
                onInspectRun={(teamRunId) => setInspectRun({ teamRunId })}
              />
            ))}
          </div>
        )}
      </SectionPage>

      <RunDetailDrawer
        open={!!inspectRun}
        onClose={() => setInspectRun(null)}
        run={syntheticRun}
        aiLenserId={aiLenserId}
        handle={profile.handle}
      />
    </>
  )
}
