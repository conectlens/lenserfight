import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'

import type { EventDispatchRecord, RuleDispatchSummary } from '../../types'

export const RULE_DISPATCH_HISTORY_QUERY_KEY = ['automation', 'rule_dispatch_history_30d'] as const

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Aggregates the last 30 days of `automation.event_dispatches` rows
 * into per-rule counts. Used by RuleCard to compute success rate
 * and "last fired" timestamp without an extra round-trip per card.
 */
export function useRuleDispatchHistory() {
  const { user } = useAuth()

  return useQuery<Map<string, RuleDispatchSummary>>({
    queryKey: RULE_DISPATCH_HISTORY_QUERY_KEY,
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
      const { data, error } = await supabase
        .schema('automation')
        .from('event_dispatches')
        .select('event_id,rule_id,status,attempted_at,error')
        .gte('attempted_at', since)
      if (error) throw error

      const rows = (data ?? []) as EventDispatchRecord[]
      const summary = new Map<string, RuleDispatchSummary>()

      for (const row of rows) {
        const existing = summary.get(row.rule_id) ?? {
          rule_id: row.rule_id,
          dispatched_count: 0,
          failed_count: 0,
          skipped_count: 0,
          queued_count: 0,
          last_attempted_at: null,
        }

        if (row.status === 'dispatched') existing.dispatched_count += 1
        else if (row.status === 'failed') existing.failed_count += 1
        else if (row.status === 'skipped') existing.skipped_count += 1
        else if (row.status === 'queued') existing.queued_count += 1

        if (row.attempted_at) {
          if (
            !existing.last_attempted_at ||
            new Date(row.attempted_at).getTime() > new Date(existing.last_attempted_at).getTime()
          ) {
            existing.last_attempted_at = row.attempted_at
          }
        }

        summary.set(row.rule_id, existing)
      }

      return summary
    },
  })
}
