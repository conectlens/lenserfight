import { queryKeys } from '@lenserfight/data/cache'
import { artifactLifecycleRepository } from '@lenserfight/data/repositories'
import type { ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface PinArtifactVars {
  type: ArtifactLifecycleType
  id: string
  pinned: boolean
  extraInvalidateKeys?: QueryKey[]
}

export function usePinArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id, pinned }: PinArtifactVars) =>
      pinned
        ? artifactLifecycleRepository.pin(type, id)
        : artifactLifecycleRepository.unpin(type, id),
    onSuccess: (_, { type, id, pinned, extraInvalidateKeys }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.artifactLifecycle.status(type, id),
      })
      for (const key of extraInvalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      toast.success(pinned ? 'Pinned.' : 'Unpinned.')
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update pin. Please try again.')
    },
  })
}
