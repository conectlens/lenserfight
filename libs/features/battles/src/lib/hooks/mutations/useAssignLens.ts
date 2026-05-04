import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { AssignLensInput } from '@lenserfight/data/repositories'

export function useAssignLens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AssignLensInput) => battlesService.assignLensToContender(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.lensAssignment(variables.contender_id) })
    },
  })
}
