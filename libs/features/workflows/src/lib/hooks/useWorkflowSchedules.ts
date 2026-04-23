import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import type { UpsertWorkflowScheduleInput, WorkflowScheduleRecord } from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useWorkflowSchedules(workflowId?: string, enabled = true) {
  return useQuery<WorkflowScheduleRecord[]>({
    queryKey: queryKeys.workflows.schedules(workflowId ?? null),
    queryFn: () => workflowsService.getSchedules(workflowId),
    enabled: enabled && workflowId !== '',
    staleTime: 1000 * 30,
  })
}

export function useUpsertWorkflowSchedule(workflowId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertWorkflowScheduleInput) => workflowsService.upsertSchedule(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.schedules(workflowId ?? null) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.schedules(null) }),
      ])
    },
  })
}

export function useDeleteWorkflowSchedule(workflowId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: string) => workflowsService.deleteSchedule(scheduleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.schedules(workflowId ?? null) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.schedules(null) }),
      ])
    },
  })
}
