import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'

import type { TriggerRuleRecord } from '../../types'
import { AUTOMATION_RULES_QUERY_KEY } from '../query/useAutomationRules'

export function useDeleteRule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .schema('automation')
        .from('trigger_rules')
        .delete()
        .eq('id', ruleId)
      if (error) throw error
      return ruleId
    },
    onMutate: async (ruleId) => {
      await qc.cancelQueries({ queryKey: AUTOMATION_RULES_QUERY_KEY })
      const previous = qc.getQueryData<TriggerRuleRecord[]>(AUTOMATION_RULES_QUERY_KEY)
      if (previous) {
        qc.setQueryData<TriggerRuleRecord[]>(
          AUTOMATION_RULES_QUERY_KEY,
          previous.filter((r) => r.id !== ruleId)
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
