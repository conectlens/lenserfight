import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lensesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { CreateLensVersionDTO } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'

export const useLensVersions = (lensId: string, options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()

  const {
    data: versions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.lensVersions.list(lensId),
    queryFn: () => lensesService.getVersions(lensId),
    enabled: (options?.enabled !== false) && !!lensId,
    staleTime: 30_000,
  })

  const { mutateAsync: createVersion, isPending: isCreating } = useMutation({
    mutationFn: (input: CreateLensVersionDTO) => lensesService.createVersion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.list(lensId) })
    },
    onError: (err) => toastError(err),
  })

  const { mutateAsync: publishVersion, isPending: isPublishing } = useMutation({
    mutationFn: (versionId: string) => lensesService.publishVersion(versionId),
    onSuccess: (_data, versionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.list(lensId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.detail(versionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.latestPublished(lensId) })
    },
    onError: (err) => toastError(err),
  })

  return {
    versions,
    isLoading,
    error,
    createVersion,
    isCreating,
    publishVersion,
    isPublishing,
  }
}

export const useLensVersionDetail = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.lensVersions.detail(versionId ?? ''),
    queryFn: () => lensesService.getVersionById(versionId!),
    enabled: !!versionId,
    staleTime: 60_000,
  })
}

export const useLatestPublishedVersion = (lensId: string) => {
  return useQuery({
    queryKey: queryKeys.lensVersions.latestPublished(lensId),
    queryFn: () => lensesService.getLatestPublishedVersion(lensId),
    enabled: !!lensId,
    staleTime: 60_000,
  })
}
