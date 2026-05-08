import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'

import type { TriggerRuleRecord } from '../../types'

export const AUTOMATION_RULES_QUERY_KEY = ['automation', 'trigger_rules'] as const

/**
 * Lists the signed-in lenser's automation trigger rules.
 *
 * RLS in `automation` schema scopes rows to `lenser_id = auth.uid()`,
 * so the client only sees its own rules.
 */
export function useAutomationRules() {
  const { user } = useAuth()

  return useQuery<TriggerRuleRecord[]>({
    queryKey: AUTOMATION_RULES_QUERY_KEY,
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('automation')
        .from('trigger_rules')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TriggerRuleRecord[]
    },
  })
}
