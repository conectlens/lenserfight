import { useMutation, useQueryClient } from '@tanstack/react-query'
import { battlesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'

export const usePublishBattle = (battleSlug: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (battleId: string) => battlesService.publishBattle(battleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.detail(battleSlug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.all })
    },
  })
}
