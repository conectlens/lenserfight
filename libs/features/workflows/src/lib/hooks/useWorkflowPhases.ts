import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import type { WorkflowPhaseRecord, WorkflowTaskRecord } from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ── Phase queries ─────────────────────────────────────────────────────────────

export function useWorkflowPhases(workflowId: string) {
  return useQuery<WorkflowPhaseRecord[]>({
    queryKey: queryKeys.workflows.phases(workflowId),
    queryFn: () => workflowsService.listPhases(workflowId),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })
}

export function useWorkflowTasksByWorkflow(workflowId: string) {
  return useQuery<WorkflowTaskRecord[]>({
    queryKey: queryKeys.workflows.tasksByWorkflow(workflowId),
    queryFn: () => workflowsService.listTasksByWorkflow(workflowId),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })
}

// ── Phase mutations ───────────────────────────────────────────────────────────

export function useUpsertPhase(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (phase: Partial<WorkflowPhaseRecord> & { workflow_id: string }) =>
      workflowsService.upsertPhase(phase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.phases(workflowId) })
    },
  })
}

export function useDeletePhase(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (phaseId: string) => workflowsService.deletePhase(phaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.phases(workflowId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasksByWorkflow(workflowId) })
    },
  })
}

export function useReorderPhases(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderedIds: string[]) => workflowsService.reorderPhases(workflowId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.phases(workflowId) })
    },
  })
}

// ── Task mutations ────────────────────────────────────────────────────────────

export function useUpsertTask(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (task: Partial<WorkflowTaskRecord> & { phase_id: string; workflow_id: string }) =>
      workflowsService.upsertTask(task),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasks(vars.phase_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasksByWorkflow(workflowId) })
    },
  })
}

export function useDeleteTask(workflowId: string, phaseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => workflowsService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasks(phaseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasksByWorkflow(workflowId) })
    },
  })
}

export function useReorderTasks(workflowId: string, phaseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderedIds: string[]) => workflowsService.reorderTasks(phaseId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasks(phaseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.tasksByWorkflow(workflowId) })
    },
  })
}
