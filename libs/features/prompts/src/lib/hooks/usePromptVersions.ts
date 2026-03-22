import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { CreatePromptVersionDTO } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'

export const usePromptVersions = (promptId: string) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()

  const {
    data: versions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.promptVersions.list(promptId),
    queryFn: () => promptsService.getVersions(promptId),
    enabled: !!promptId,
    staleTime: 30_000,
  })

  const { mutateAsync: createVersion, isPending: isCreating } = useMutation({
    mutationFn: (input: CreatePromptVersionDTO) => promptsService.createVersion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.promptVersions.list(promptId) })
    },
    onError: (err) => toastError(err),
  })

  const { mutateAsync: publishVersion, isPending: isPublishing } = useMutation({
    mutationFn: (versionId: string) => promptsService.publishVersion(versionId),
    onSuccess: (_data, versionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.promptVersions.list(promptId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.promptVersions.detail(versionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.promptVersions.latestPublished(promptId) })
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

export const usePromptVersionDetail = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.promptVersions.detail(versionId ?? ''),
    queryFn: () => promptsService.getVersionById(versionId!),
    enabled: !!versionId,
    staleTime: 60_000,
  })
}

export const useLatestPublishedVersion = (promptId: string) => {
  return useQuery({
    queryKey: queryKeys.promptVersions.latestPublished(promptId),
    queryFn: () => promptsService.getLatestPublishedVersion(promptId),
    enabled: !!promptId,
    staleTime: 60_000,
  })
}
