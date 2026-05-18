import { queryKeys } from '@lenserfight/data/cache'
import { artifactLifecycleRepository } from '@lenserfight/data/repositories'
import type { ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface DeleteArtifactVars {
  type: ArtifactLifecycleType
  id: string
  extraInvalidateKeys?: QueryKey[]
  onDeleted?: () => void
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id }: DeleteArtifactVars) =>
      artifactLifecycleRepository.delete(type, id),
    onSuccess: (_, { type, id, extraInvalidateKeys, onDeleted }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.artifactLifecycle.status(type, id),
      })
      for (const key of extraInvalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      toast.success('Deleted successfully.')
      onDeleted?.()
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to delete. Please try again.')
    },
  })
}
