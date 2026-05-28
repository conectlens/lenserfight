import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executionService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { ArtifactVisibility, SetArtifactVisibilityDTO } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'

/**
 * Mutation hook for changing an artifact's visibility.
 * Only the artifact owner (verified by SECURITY DEFINER RPC) may change it.
 * Invalidates the artifacts cache for the relevant run on success.
 */
export function useArtifactVisibility(runId: string | null) {
  const queryClient = useQueryClient()
  const { toastError } = useToast()

  const { mutateAsync: setVisibility, isPending } = useMutation({
    mutationFn: (dto: SetArtifactVisibilityDTO) => executionService.setArtifactVisibility(dto),
    onSuccess: () => {
      if (runId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.executions.artifacts(runId) })
      }
    },
    onError: (err) => toastError(err),
  })

  return { setVisibility, isPending }
}

export type { ArtifactVisibility, SetArtifactVisibilityDTO }
