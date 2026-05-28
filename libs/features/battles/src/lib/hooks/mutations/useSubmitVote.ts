import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { SubmitVoteInput } from '@lenserfight/data/repositories'


export const useSubmitVote = (battleId?: string) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, SubmitVoteInput>({
    mutationFn: (input) => battlesService.submitVote(input),
    onSuccess: () => {
      if (battleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.battles.aggregates(battleId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.battles.detail(battleId) })
      }
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to submit vote. Please try again.')
    },
  })
}
