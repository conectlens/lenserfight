import { queryKeys } from '@lenserfight/data/cache'
import { artifactLifecycleRepository } from '@lenserfight/data/repositories'
import type { ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface RestoreArtifactVars {
  type: ArtifactLifecycleType
  id: string
  extraInvalidateKeys?: QueryKey[]
}

export function useRestoreArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id }: RestoreArtifactVars) =>
      artifactLifecycleRepository.restore(type, id),
    onSuccess: (_, { type, id, extraInvalidateKeys }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.artifactLifecycle.status(type, id),
      })
      for (const key of extraInvalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      toast.success('Restored successfully.')
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to restore. Please try again.')
    },
  })
}
