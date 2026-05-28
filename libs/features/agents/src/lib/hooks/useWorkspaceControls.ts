import { queryKeys } from '@lenserfight/data/cache'
import {
  SupabaseRunReportsRepository,
  SupabaseWorkspaceControlsRepository,
} from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const controlsRepo = new SupabaseWorkspaceControlsRepository()
const reportsRepo = new SupabaseRunReportsRepository()

export function useWorkspaceControls(aiLenserId: string) {
  const qc = useQueryClient()

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: queryKeys.agents.runUnified(aiLenserId) })
    qc.invalidateQueries({ queryKey: queryKeys.agents.workspaceSettings(aiLenserId) })
    qc.invalidateQueries({ queryKey: queryKeys.agents.policyLog(aiLenserId) })
  }

  const cancelRun = useMutation({
    mutationFn: (teamRunId: string) => controlsRepo.cancelRun(teamRunId),
    onSuccess: () => invalidateAll(),
  })

  const pauseAgent = useMutation({
    mutationFn: () => controlsRepo.pauseAgent(aiLenserId),
    onSuccess: () => invalidateAll(),
  })

  const resumeAgent = useMutation({
    mutationFn: () => controlsRepo.resumeAgent(aiLenserId),
    onSuccess: () => invalidateAll(),
  })

  const toggleKillSwitch = useMutation({
    mutationFn: (enabled: boolean) => controlsRepo.toggleKillSwitch(aiLenserId, enabled),
    onSuccess: () => invalidateAll(),
  })

  const updateSettings = useMutation({
    mutationFn: (patch: Parameters<typeof controlsRepo.updateWorkspaceSettings>[1]) =>
      controlsRepo.updateWorkspaceSettings(aiLenserId, patch),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.agents.workspaceSettings(aiLenserId) }),
  })

  const createRunReport = useMutation({
    mutationFn: (teamRunId: string) => reportsRepo.createRunReport(teamRunId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.agents.runReports(aiLenserId) }),
  })

  return { cancelRun, pauseAgent, resumeAgent, toggleKillSwitch, updateSettings, createRunReport }
}
