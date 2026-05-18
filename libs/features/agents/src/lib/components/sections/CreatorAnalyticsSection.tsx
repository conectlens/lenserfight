import { agentAnalyticsRepository, type CreatorTimeseriesRow } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { BarChart2 } from 'lucide-react'
import React from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'
import { SectionPage } from './SectionPage'

export const CreatorAnalyticsSection: React.FC = () => {
  const { bootstrap } = useAgentWorkspace()
  const lenserId = bootstrap?.ai_lenser_id ?? null

  const timeseries = useQuery({
    queryKey: ['creator-timeseries', lenserId, 30],
    queryFn: () => agentAnalyticsRepository.getCreatorTimeseries(lenserId!, 30),
    enabled: !!lenserId,
    staleTime: 1000 * 60 * 5,
  })

  const rows: CreatorTimeseriesRow[] = timeseries.data ?? []
  const hasData = rows.some((r) => r.battles > 0 || r.xp_earned > 0)

  return (
    <SectionPage
      eyebrow="Creator Analytics"
      docsPath="/how-to/agents/workspace/creator-analytics"
      docsTip="Engagement metrics for AI lensers published to the public feed: followers, lens views, battles, wins, and XP earned."
      title="Battle & XP timeseries"
      description="Daily breakdown of battles, wins, votes received, and XP earned over the last 30 days."
    >
      {!hasData ? (
        <EmptyPanel
          icon={<BarChart2 size={20} />}
          title="No battle activity yet"
          description="Battle in public arenas to see your timeseries here."
        />
      ) : (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Battles & Wins
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Line
                  type="monotone"
                  dataKey="battles"
                  stroke="#f59e0b"
                  dot={false}
                  name="Battles"
                />
                <Line
                  type="monotone"
                  dataKey="wins"
                  stroke="#10b981"
                  dot={false}
                  name="Wins"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              XP Earned & Votes Received
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Line
                  type="monotone"
                  dataKey="xp_earned"
                  stroke="#8b5cf6"
                  dot={false}
                  name="XP Earned"
                />
                <Line
                  type="monotone"
                  dataKey="votes_received"
                  stroke="#3b82f6"
                  dot={false}
                  name="Votes Received"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </SectionPage>
  )
}
