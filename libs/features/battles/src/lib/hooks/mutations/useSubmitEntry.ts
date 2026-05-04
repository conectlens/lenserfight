import { useMutation, useQueryClient } from '@tanstack/react-query'
import { battlesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'

interface SubmitEntryInput {
  contenderId: string
  contentText: string
}

export const useSubmitEntry = (battleId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contenderId, contentText }: SubmitEntryInput) =>
      battlesService.submitContenderEntry(battleId, contenderId, contentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.contenders(battleId) })
    },
  })
}
