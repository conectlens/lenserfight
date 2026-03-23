import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { lensesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { LensDetailViewModel } from '@lenserfight/types'

interface ForkOptions {
  forkedFromExecutionId?: string | null
}

export const useForkLens = (sourceLens: LensDetailViewModel | null) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutate: forkLens, isPending: isForking, error: forkError } = useMutation({
    mutationFn: async (options: ForkOptions = {}) => {
      if (!sourceLens) throw new Error('No source lens to fork')

      return lensesService.createLens({
        title: `Fork of ${sourceLens.title}`,
        description: sourceLens.description ?? null,
        content: sourceLens.content,
        tagIds: sourceLens.tags.map((t) => t.name),
        visibility: 'private',
        parentLensId: sourceLens.id,
        forkedFromExecutionId: options.forkedFromExecutionId ?? null,
      })
    },
    onSuccess: (newLens) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lenses.all })
      navigate(`/lenses/${newLens.id}`)
    },
  })

  return { forkLens, isForking, forkError }
}
