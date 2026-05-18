import { queryKeys } from '@lenserfight/data/cache'
import { artifactLifecycleRepository } from '@lenserfight/data/repositories'
import type { ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ArchiveArtifactVars {
  type: ArtifactLifecycleType
  id: string
  extraInvalidateKeys?: QueryKey[]
}

export function useArchiveArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id }: ArchiveArtifactVars) =>
      artifactLifecycleRepository.archive(type, id),
    onSuccess: (_, { type, id, extraInvalidateKeys }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.artifactLifecycle.status(type, id),
      })
      for (const key of extraInvalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      toast.success('Archived successfully.')
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to archive. Please try again.')
    },
  })
}
