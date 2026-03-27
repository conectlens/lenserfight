import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

export function useForkWorkflow() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (sourceId: string) => workflowsService.forkWorkflow(sourceId),
    onSuccess: (newWorkflow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
      navigate(`/workflows/${newWorkflow.id}`)
    },
  })
}
