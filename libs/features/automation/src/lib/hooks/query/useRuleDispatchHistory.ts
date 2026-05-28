import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'

import type { RuleDispatchSummary } from '../../types'

export const RULE_DISPATCH_HISTORY_QUERY_KEY = ['automation', 'rule_dispatch_history_30d'] as const

export function useRuleDispatchHistory() {
  const { user } = useAuth()

  return useQuery<Map<string, RuleDispatchSummary>>({
    queryKey: RULE_DISPATCH_HISTORY_QUERY_KEY,
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_rule_dispatch_summary', { p_days: 30 })
      if (error) throw error

      const summary = new Map<string, RuleDispatchSummary>()
      for (const row of data ?? []) {
        summary.set(row.rule_id, {
          rule_id: row.rule_id,
          dispatched_count: row.dispatched_count ?? 0,
          failed_count: row.failed_count ?? 0,
          skipped_count: row.skipped_count ?? 0,
          queued_count: row.queued_count ?? 0,
          last_attempted_at: row.last_attempted_at ?? null,
        })
      }
      return summary
    },
  })
}
