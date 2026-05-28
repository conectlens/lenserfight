import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'

import type { TriggerRuleRecord } from '../../types'

export const AUTOMATION_RULES_QUERY_KEY = ['automation', 'trigger_rules'] as const

export function useAutomationRules() {
  const { user } = useAuth()

  return useQuery<TriggerRuleRecord[]>({
    queryKey: AUTOMATION_RULES_QUERY_KEY,
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_list_automation_rules', { p_limit: 200 })
      if (error) throw error
      return (data ?? []) as TriggerRuleRecord[]
    },
  })
}
