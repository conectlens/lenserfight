import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useWorkflowVersions(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.workflows.versions(workflowId),
    queryFn: () => workflowsService.getVersions(workflowId),
    enabled: !!workflowId,
    staleTime: 1000 * 60 * 2,
  })
}


export function useWorkflowVersionSnapshot(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ['workflow', 'version-snapshot', versionId],
    queryFn: () => (versionId ? workflowsService.getVersionSnapshot(versionId) : Promise.resolve(null)),
    enabled: !!versionId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateWorkflowVersion(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (changelog?: string) =>
      workflowsService.createVersion(workflowId, changelog),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.versions(workflowId) })
    },
  })
}

export function usePublishWorkflowVersion(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) =>
      workflowsService.publishVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.versions(workflowId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowId) })
    },
  })
}

export function useRestoreWorkflowVersion(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) =>
      workflowsService.restoreVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.versions(workflowId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.nodes(workflowId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.edges(workflowId) })
    },
  })
}
