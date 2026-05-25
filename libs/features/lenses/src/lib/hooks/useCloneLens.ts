import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { lensesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { LensDetailViewModel } from '@lenserfight/types'

export const useCloneLens = (sourceLens: LensDetailViewModel | null) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutate: cloneLens, isPending: isCloning, error: cloneError } = useMutation({
    mutationFn: async (versionId?: string | null) => {
      if (!sourceLens) throw new Error('No source lens to clone')
      return lensesService.cloneLens(sourceLens.id, versionId)
    },
    onSuccess: (newLensId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lenses.all })
      navigate(`/lenses/${newLensId}/main`)
    },
  })

  return { cloneLens, isCloning, cloneError }
}
