import { supabase } from '@lenserfight/data/supabase'
import type { IncidentSeverity, RunIncidentRecord } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import React from 'react'

interface RecentIncidentsFeedProps {
  aiLenserId: string
}

const SEVERITY_BADGE: Record<IncidentSeverity, string> = {
  low: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
  medium:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300',
  high: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
  critical:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
}

function isKnownSeverity(s: string): s is IncidentSeverity {
  return ['low', 'medium', 'high', 'critical'].includes(s)
}

export const RecentIncidentsFeed: React.FC<RecentIncidentsFeedProps> = ({
  aiLenserId,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['agents', 'recentIncidents', aiLenserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_list_agent_incidents', {
        p_ai_lenser_id: aiLenserId,
        p_limit: 5,
        p_cursor: null,
      })
      if (error) throw error
      return (data ?? []) as RunIncidentRecord[]
    },
    enabled: !!aiLenserId,
    staleTime: 60_000,
  })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Recent Incidents
      </h3>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            />
          ))
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No incidents.</p>
        ) : (
          data.map((incident) => {
            const severityClass = isKnownSeverity(incident.severity)
              ? SEVERITY_BADGE[incident.severity]
              : SEVERITY_BADGE.low
            const isResolved = !!incident.resolved_at
            return (
              <div
                key={incident.id}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
              >
                <span
                  className={`mt-0.5 flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityClass}`}
                >
                  {incident.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {incident.incident_type}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        isResolved
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300'
                          : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                      }`}
                    >
                      {isResolved ? 'resolved' : 'open'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {incident.title}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
