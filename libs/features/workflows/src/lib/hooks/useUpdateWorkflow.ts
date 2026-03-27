import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService, type UpdateWorkflowInput } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateWorkflow(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateWorkflowInput) =>
      workflowsService.updateWorkflow(workflowId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
    },
  })
}
