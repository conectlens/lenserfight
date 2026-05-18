import { Card } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { BarChart2, Coins } from 'lucide-react'
import React, { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { useAgentAnalytics } from '../../hooks/useAgentAnalytics'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

import type {
  AnalyticsCostByModel,
  AnalyticsCostTimePoint,
  AnalyticsEvalQualityRow,
  AnalyticsWorkflowPerfRow,
} from '@lenserfight/types'

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  days: number
  onDaysChange: (days: number) => void
}

const FilterBar: React.FC<FilterBarProps> = ({ days, onDaysChange }) => (
  <div className="flex gap-2 mb-4 text-sm">
    <SelectField
      label="Period"
      value={String(days)}
      onChange={(value) => onDaysChange(Number(value))}
      options={[
        { value: '7', label: 'Last 7 days' },
        { value: '14', label: 'Last 14 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 90 days' },
      ]}
      className="w-44"
    />
  </div>
)

// ─── CostDashboardPanel ───────────────────────────────────────────────────────

interface CostDashboardPanelProps {
  costByModel: AnalyticsCostByModel[]
  costTimeSeries: AnalyticsCostTimePoint[]
}

const CostDashboardPanel: React.FC<CostDashboardPanelProps> = ({
  costByModel,
  costTimeSeries,
}) => (
  <Card>
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-3">
      Cost over time
    </p>
    {costTimeSeries.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">No cost time series data.</p>
    ) : (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={costTimeSeries} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="period_date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 12 }}
            formatter={(v) => [v, 'credits']}
          />
          <Bar dataKey="total_credits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}

    {costByModel.length > 0 && (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2 font-semibold">Model</th>
              <th className="px-3 py-2 font-semibold">Provider</th>
              <th className="px-3 py-2 font-semibold">Credits</th>
              <th className="px-3 py-2 font-semibold">Runs</th>
            </tr>
          </thead>
          <tbody>
            {costByModel.map((row) => (
              <tr
                key={row.model_key}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                  {row.model_key}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.provider}</td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                  {row.total_credits.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.run_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
)

// ─── QualityMetricsPanel ──────────────────────────────────────────────────────

interface QualityMetricsPanelProps {
  evalQuality: AnalyticsEvalQualityRow[]
}

const QualityMetricsPanel: React.FC<QualityMetricsPanelProps> = ({ evalQuality }) => (
  <Card>
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-3">
      Evaluation quality
    </p>
    {evalQuality.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">No evaluation data</p>
    ) : (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={evalQuality} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="period_date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
          />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 12 }}
            formatter={(v, name) => [
              typeof v === 'number' ? v.toFixed(3) : v,
              name === 'pass_rate' ? 'Pass rate' : 'Mean score',
            ]}
          />
          <ReferenceLine
            y={0.7}
            stroke="gray"
            strokeDasharray="3 3"
            label={{ value: 'threshold', position: 'right', fontSize: 9, fill: 'gray' }}
          />
          <Line
            type="monotone"
            dataKey="pass_rate"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f59e0b' }}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="mean_score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </Card>
)

// ─── WorkflowTimelinePanel ────────────────────────────────────────────────────

interface WorkflowTimelinePanelProps {
  workflowPerf: AnalyticsWorkflowPerfRow[]
}

const WorkflowTimelinePanel: React.FC<WorkflowTimelinePanelProps> = ({ workflowPerf }) => (
  <Card>
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-3">
      Workflow performance
    </p>
    {workflowPerf.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">No workflow performance data</p>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={workflowPerf} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="workflow_title"
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} unit="ms" />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 12 }}
              formatter={(v, name) => [
                `${v} ms`,
                name === 'p50_duration_ms' ? 'P50 duration' : 'P95 duration',
              ]}
            />
            <Bar dataKey="p50_duration_ms" fill="#6366f1" radius={[4, 4, 0, 0]} name="P50" />
            <Bar dataKey="p95_duration_ms" fill="#a5b4fc" radius={[4, 4, 0, 0]} name="P95" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-2">
          {workflowPerf.map((wpd) => (
            <span
              key={`${wpd.workflow_title}-${wpd.period_date}`}
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {wpd.workflow_title}:{' '}
              <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
                {wpd.failure_rate != null
                  ? `${(wpd.failure_rate * 100).toFixed(1)}% failures`
                  : '—'}
              </span>
            </span>
          ))}
        </div>
      </>
    )}
  </Card>
)

// ─── AnalyticsSection (main export) ──────────────────────────────────────────

export const AnalyticsSection: React.FC = () => {
  const { bootstrap, bootstrapState } = useAgentWorkspace()
  const [days, setDays] = useState(30)
  const { data, isLoading } = useAgentAnalytics(bootstrap?.ai_lenser_id, { days })

  return (
    <SectionPage
      eyebrow="Analytics"
      docsPath="/how-to/agents/workspace/analytics"
      docsTip="Request volume, latency p50/p95, and success rate per workflow. Pair with Reports for exports and Creator Analytics for public engagement."
      title="Cost, Quality & Performance"
      description="Per-model cost breakdown, evaluation pass rates, and workflow duration percentiles. Use the period selector to zoom in on recent spikes or zoom out for trend analysis."
    >
      {!bootstrap ? (
        bootstrapState.kind === 'idle' ? (
          <EmptyPanel
            icon={<BarChart2 size={20} />}
            title="No analytics data"
            description="Open an AI lenser workspace to view cost, evaluation quality, and workflow performance."
          />
        ) : (
          <BootstrapStatusPanel state={bootstrapState} />
        )
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="h-52 rounded-lg bg-gray-100 animate-pulse dark:bg-gray-800" />
          <div className="h-52 rounded-lg bg-gray-100 animate-pulse dark:bg-gray-800" />
          <div className="h-52 rounded-lg bg-gray-100 animate-pulse dark:bg-gray-800" />
        </div>
      ) : (
        <>
          <FilterBar days={days} onDaysChange={setDays} />
          <CostDashboardPanel
            costByModel={data?.cost_by_model ?? []}
            costTimeSeries={data?.cost_time_series ?? []}
          />
          <QualityMetricsPanel evalQuality={data?.eval_quality ?? []} />
          <WorkflowTimelinePanel workflowPerf={data?.workflow_perf ?? []} />
        </>
      )}
    </SectionPage>
  )
}
