import { moderationRepository } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ModerationDecisionType } from '@lenserfight/data/repositories'

export interface OverrideModerationDecisionInput {
  decisionId: string
  overrideDecisionType: ModerationDecisionType
  reason: string
}

/**
 * Applies an admin override to a moderation decision.
 * Backed by RPC `public.fn_decide_moderation_override`.
 * Invalidates all `['moderation-decisions', ...]` cache entries on success.
 */
export function useOverrideModerationDecision() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, OverrideModerationDecisionInput>({
    mutationFn: (input) => moderationRepository.overrideModerationDecision(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-decisions'] })
      toast.success('Override applied.')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to apply override. Please try again.')
    },
  })
}
