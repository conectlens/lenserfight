import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'

import type { TriggerRuleRecord } from '../../types'
import { AUTOMATION_RULES_QUERY_KEY } from '../query/useAutomationRules'

interface ToggleRuleInput {
  ruleId: string
  isActive: boolean
}

export function useToggleRule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ ruleId, isActive }: ToggleRuleInput) => {
      const { data, error } = await supabase
        .schema('automation')
        .from('trigger_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId)
        .select('*')
        .single()
      if (error) throw error
      return data as TriggerRuleRecord
    },
    // Optimistic update so the toggle is instant.
    onMutate: async ({ ruleId, isActive }) => {
      await qc.cancelQueries({ queryKey: AUTOMATION_RULES_QUERY_KEY })
      const previous = qc.getQueryData<TriggerRuleRecord[]>(AUTOMATION_RULES_QUERY_KEY)
      if (previous) {
        qc.setQueryData<TriggerRuleRecord[]>(
          AUTOMATION_RULES_QUERY_KEY,
          previous.map((r) => (r.id === ruleId ? { ...r, is_active: isActive } : r))
        )
      }
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(AUTOMATION_RULES_QUERY_KEY, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: AUTOMATION_RULES_QUERY_KEY })
    },
  })
}
