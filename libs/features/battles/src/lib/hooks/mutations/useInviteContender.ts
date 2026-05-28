import { useMutation, useQueryClient } from '@tanstack/react-query'
import { battlesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import type { InviteContenderInput } from '@lenserfight/data/repositories'

export const useInviteContender = (battleId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InviteContenderInput) => battlesService.inviteContender(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.contenders(battleId) })
    },
  })
}
